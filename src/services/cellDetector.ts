import {
  DetectedCell,
  DetectionParameters,
  CalibrationSettings,
  HemocytometerConfig,
  CountingResults
} from '../types/cells';

export interface RawDetectionResult {
  cells: DetectedCell[];
  processedWidth: number;
  processedHeight: number;
}

/**
 * High-performance client-side computer vision cell detector for Trypan Blue brightfield microscopy.
 */
export function detectCellsFromImageData(
  imageData: ImageData,
  params: DetectionParameters,
  calibration: CalibrationSettings,
  hemocytometer: HemocytometerConfig
): DetectedCell[] {
  const { width, height, data } = imageData;
  const {
    minDiameterMicrons,
    maxDiameterMicrons,
    minCircularity,
    blueDyeSensitivity
  } = params;

  const umPerPx = calibration.micronsPerPixel;
  const minRadiusPx = Math.max(3, Math.round((minDiameterMicrons / umPerPx) / 2));
  const maxRadiusPx = Math.max(minRadiusPx + 2, Math.round((maxDiameterMicrons / umPerPx) / 2));

  // 1. Compute per-pixel luminance and blue excess
  // Blue excess metric: B - (R + G)/2, standardized to 0-255 scale
  const pixelCount = width * height;
  const luminance = new Float32Array(pixelCount);
  const blueExcess = new Float32Array(pixelCount);

  let bgLumSum = 0;
  for (let i = 0, p = 0; i < pixelCount; i++, p += 4) {
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    luminance[i] = lum;
    // Blue dye stains cell dark blue/indigo -> blue channel is higher than red/green
    const bExc = b - (r + g) * 0.5;
    blueExcess[i] = bExc;
    bgLumSum += lum;
  }
  const avgBackgroundLum = bgLumSum / pixelCount;

  // 2. Candidate peak search using local extrema on grid
  // Grid stride to keep detection snappy (e.g. 3-4 px step)
  const step = Math.max(2, Math.floor(minRadiusPx / 2));
  const candidates: Array<{ x: number; y: number; isBlueLead: boolean; coreVal: number }> = [];

  const blueThresh = (blueDyeSensitivity - 50) * 0.6 + 8; // adjusted threshold

  for (let y = maxRadiusPx; y < height - maxRadiusPx; y += step) {
    for (let x = maxRadiusPx; x < width - maxRadiusPx; x += step) {
      const idx = y * width + x;
      const bExc = blueExcess[idx];
      const lum = luminance[idx];

      // Condition A: High blue excess (candidate dead cell)
      if (bExc > blueThresh && lum < avgBackgroundLum * 0.95) {
        // check local maximum in blue excess within step window
        let isLocalMax = true;
        for (let dy = -step; dy <= step && isLocalMax; dy += step) {
          for (let dx = -step; dx <= step; dx += step) {
            if (dx === 0 && dy === 0) continue;
            if (blueExcess[(y + dy) * width + (x + dx)] > bExc) {
              isLocalMax = false;
              break;
            }
          }
        }
        if (isLocalMax) {
          candidates.push({ x, y, isBlueLead: true, coreVal: bExc });
        }
      }
      // Condition B: High refractive core (candidate live cell)
      else if (lum > avgBackgroundLum * 1.04) {
        // check local maximum in luminance
        let isLocalMax = true;
        for (let dy = -step; dy <= step && isLocalMax; dy += step) {
          for (let dx = -step; dx <= step; dx += step) {
            if (dx === 0 && dy === 0) continue;
            if (luminance[(y + dy) * width + (x + dx)] > lum) {
              isLocalMax = false;
              break;
            }
          }
        }
        if (isLocalMax) {
          candidates.push({ x, y, isBlueLead: false, coreVal: lum });
        }
      }
    }
  }

  // 3. Radial profile analysis to estimate boundary, radius, circularity, and classify
  const detectedCells: DetectedCell[] = [];
  const occupiedMask = new Uint8Array(pixelCount); // prevent duplicates

  let cellIndex = 1;

  for (const cand of candidates) {
    const { x: cx, y: cy, isBlueLead } = cand;
    const centerIdx = cy * width + cx;
    if (occupiedMask[centerIdx]) continue;

    // Measure radial gradients in 8 directions (0, 45, 90, 135, 180, 225, 270, 315 deg)
    const angles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2, (7 * Math.PI) / 4];
    const radiiFound: number[] = [];

    for (const angle of angles) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      let bestR = minRadiusPx;
      let maxGrad = -9999;

      let prevVal = isBlueLead ? blueExcess[centerIdx] : luminance[centerIdx];

      for (let r = minRadiusPx; r <= maxRadiusPx; r++) {
        const px = Math.round(cx + r * cos);
        const py = Math.round(cy + r * sin);
        if (px < 0 || px >= width || py < 0 || py >= height) break;
        const pIdx = py * width + px;

        const curVal = isBlueLead ? blueExcess[pIdx] : luminance[pIdx];
        // For live cell, boundary is dark ring -> drop in luminance
        // For dead cell, boundary is transition from high blue dye to background
        const grad = isBlueLead ? (prevVal - curVal) : (prevVal - curVal);

        if (grad > maxGrad) {
          maxGrad = grad;
          bestR = r;
        }
        prevVal = curVal;
      }
      radiiFound.push(bestR);
    }

    if (radiiFound.length < 8) continue;

    // Calculate mean radius and variance for circularity
    const meanR = radiiFound.reduce((a, b) => a + b, 0) / radiiFound.length;
    const variance = radiiFound.reduce((acc, r) => acc + Math.pow(r - meanR, 2), 0) / radiiFound.length;
    const stdDev = Math.sqrt(variance);

    // Circularity metric: 1.0 for perfect circle, lower for irregular
    const circularity = Math.max(0.1, Math.min(1.0, 1.0 - (stdDev / meanR) * 1.5));

    const diameterMicrons = meanR * 2 * umPerPx;

    // Sample statistics within cell body
    let cellPixCount = 0;
    let blueSum = 0;
    let lumSum = 0;

    const sampleR = Math.max(2, Math.floor(meanR * 0.7));
    for (let dy = -sampleR; dy <= sampleR; dy++) {
      for (let dx = -sampleR; dx <= sampleR; dx++) {
        if (dx * dx + dy * dy <= sampleR * sampleR) {
          const sx = cx + dx;
          const sy = cy + dy;
          if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
            const idx = sy * width + sx;
            blueSum += blueExcess[idx];
            lumSum += luminance[idx];
            cellPixCount++;
          }
        }
      }
    }

    const meanBlueScore = cellPixCount > 0 ? blueSum / cellPixCount : 0;
    const meanCoreLum = cellPixCount > 0 ? lumSum / cellPixCount : 128;

    // Classification logic
    let type: 'viable' | 'dead' | 'debris' = 'viable';

    if (diameterMicrons < minDiameterMicrons || diameterMicrons > maxDiameterMicrons || circularity < minCircularity) {
      type = 'debris';
    } else if (meanBlueScore > blueThresh || isBlueLead) {
      type = 'dead';
    } else {
      type = 'viable';
    }

    // Hemocytometer SOP border rule check (Improved Neubauer inclusion: count top and left, exclude bottom and right if enabled)
    let isBorderExcluded = false;
    if (hemocytometer.enforceBorderRule && hemocytometer.gridOverlayEnabled) {
      const squareSize = 240;
      const hx = width / 2;
      const hy = height / 2;
      // If near right or bottom border lines
      const inRightBorder = Math.abs(cx - (hx + squareSize)) < meanR * 0.8 || Math.abs(cx - (hx + squareSize / 2)) < meanR * 0.8;
      const inBottomBorder = Math.abs(cy - (hy + squareSize)) < meanR * 0.8 || Math.abs(cy - (hy + squareSize / 2)) < meanR * 0.8;
      if (inRightBorder || inBottomBorder) {
        isBorderExcluded = true;
      }
    }

    // Confidence estimation based on circularity and optical contrast
    const confidence = Math.min(0.99, Math.max(0.65, circularity * 0.7 + (type === 'viable' ? (meanCoreLum / avgBackgroundLum) * 0.3 : (meanBlueScore / 40) * 0.3)));

    detectedCells.push({
      id: `cell-${cellIndex++}`,
      x: cx,
      y: cy,
      radius: meanR,
      diameterMicrons: Number(diameterMicrons.toFixed(1)),
      type,
      confidence: Number(confidence.toFixed(2)),
      circularity: Number(circularity.toFixed(2)),
      blueChromaScore: Number(meanBlueScore.toFixed(1)),
      coreBrightness: Number(meanCoreLum.toFixed(1)),
      isBorderExcluded,
      manual: false
    });

    // Mark surrounding pixels as occupied to avoid multi-peak splitting
    const maskR = Math.floor(meanR * 0.8);
    for (let my = -maskR; my <= maskR; my++) {
      for (let mx = -maskR; mx <= maskR; mx++) {
        if (mx * mx + my * my <= maskR * maskR) {
          const occX = cx + mx;
          const occY = cy + my;
          if (occX >= 0 && occX < width && occY >= 0 && occY < height) {
            occupiedMask[occY * width + occX] = 1;
          }
        }
      }
    }
  }

  return detectedCells;
}

/**
 * Calculates standard scientific hemocytometer results and cell viability metrics
 */
export function calculateCountingResults(
  cells: DetectedCell[],
  hemocytometer: HemocytometerConfig
): CountingResults {
  // Filter out border-excluded cells from official counts
  const countedCells = cells.filter(c => !c.isBorderExcluded);

  const viable = countedCells.filter(c => c.type === 'viable');
  const dead = countedCells.filter(c => c.type === 'dead');
  const debris = countedCells.filter(c => c.type === 'debris');

  const viableCount = viable.length;
  const deadCount = dead.length;
  const debrisCount = debris.length;
  const totalCells = viableCount + deadCount;

  // Viability percentage = (Viable / Total) * 100
  const viabilityPercent = totalCells > 0 ? (viableCount / totalCells) * 100 : 0;

  // Hemocytometer Concentration Formula:
  // Volume of 1 large 1mm x 1mm Neubauer square = 1 mm x 1 mm x 0.1 mm = 0.1 mm³ = 10^-4 mL
  // Concentration (cells/mL) = (Total cells in counted squares / Number of squares) * Dilution Factor * 10,000
  const squares = Math.max(1, hemocytometer.largeSquaresCounted);
  const factor = hemocytometer.dilutionFactor || 2;
  const depthFactor = (0.1 / hemocytometer.chamberDepthMm) * 10000; // 10,000 at standard 0.1mm

  const viableConcentration = (viableCount / squares) * factor * depthFactor;
  const totalConcentration = (totalCells / squares) * factor * depthFactor;

  // Total viable cells harvested in full suspension volume
  const totalViableYield = viableConcentration * hemocytometer.cultureVolumeMl;

  // Diameter statistics across all counted cells
  const allDiameters = [...viable, ...dead].map(c => c.diameterMicrons);
  let meanDiameterMicrons = 0;
  let stdDevDiameterMicrons = 0;

  if (allDiameters.length > 0) {
    meanDiameterMicrons = allDiameters.reduce((a, b) => a + b, 0) / allDiameters.length;
    const variance = allDiameters.reduce((acc, d) => acc + Math.pow(d - meanDiameterMicrons, 2), 0) / allDiameters.length;
    stdDevDiameterMicrons = Math.sqrt(variance);
  }

  // Clumping index: estimate percentage of cells that are within 2.2 radii of each other
  let clumpedCount = 0;
  const validCells = [...viable, ...dead];
  for (let i = 0; i < validCells.length; i++) {
    for (let j = i + 1; j < validCells.length; j++) {
      const dx = validCells[i].x - validCells[j].x;
      const dy = validCells[i].y - validCells[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < (validCells[i].radius + validCells[j].radius) * 1.25) {
        clumpedCount += 2;
        break;
      }
    }
  }
  const clumpingIndexPercent = totalCells > 0 ? Math.min(100, (clumpedCount / totalCells) * 100) : 0;

  return {
    totalCells,
    viableCells: viableCount,
    deadCells: deadCount,
    debrisCount,
    viabilityPercent: Number(viabilityPercent.toFixed(1)),
    viableConcentration: Math.round(viableConcentration),
    totalConcentration: Math.round(totalConcentration),
    totalViableYield: Math.round(totalViableYield),
    meanDiameterMicrons: Number(meanDiameterMicrons.toFixed(1)),
    stdDevDiameterMicrons: Number(stdDevDiameterMicrons.toFixed(1)),
    clumpingIndexPercent: Number(clumpingIndexPercent.toFixed(1))
  };
}

/**
 * Format large cell counts into scientific notation or human readable
 */
export function formatScientificNotation(num: number): string {
  if (num === 0) return '0';
  if (num >= 1e6) {
    const exp = Math.floor(Math.log10(num));
    const base = (num / Math.pow(10, exp)).toFixed(2);
    return `${base} × 10⁶`;
  }
  if (num >= 1e4) {
    const exp = Math.floor(Math.log10(num));
    const base = (num / Math.pow(10, exp)).toFixed(2);
    return `${base} × 10⁴`;
  }
  return num.toLocaleString();
}
