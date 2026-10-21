import { SampleDataset } from '../types/cells';

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: 'jurkat-healthy',
    name: 'Jurkat T-Cells (Healthy)',
    cellLine: 'Jurkat Clone E6-1 (Human T-Lymphocyte)',
    expectedViability: '92.4%',
    description: 'Exponential growth phase suspension culture with uniform spherical cells and prominent phase-refringent halos.',
    diameterRange: [10, 16],
    presetParams: {
      minDiameterMicrons: 8,
      maxDiameterMicrons: 22,
      minCircularity: 0.72,
      blueDyeSensitivity: 48,
    },
    presetHemocytometer: {
      dilutionFactor: 2,
      largeSquaresCounted: 4,
      cultureVolumeMl: 10,
    }
  },
  {
    id: 'cho-bioreactor',
    name: 'CHO-K1 Bioprocess Day 6',
    cellLine: 'Chinese Hamster Ovary (CHO-K1)',
    expectedViability: '76.8%',
    description: 'Fed-batch harvest phase with moderate apoptosis, occasional doublets, and cellular membrane debris.',
    diameterRange: [13, 21],
    presetParams: {
      minDiameterMicrons: 9,
      maxDiameterMicrons: 26,
      minCircularity: 0.65,
      blueDyeSensitivity: 46,
    },
    presetHemocytometer: {
      dilutionFactor: 2,
      largeSquaresCounted: 4,
      cultureVolumeMl: 25,
    }
  },
  {
    id: 'hela-cytotoxic',
    name: 'HeLa Cytotoxicity Assay',
    cellLine: 'HeLa Epithelial Adenocarcinoma',
    expectedViability: '38.2%',
    description: 'Paclitaxel-treated culture showing widespread membrane permeability, dark trypan blue dye uptake, and cell swelling.',
    diameterRange: [14, 25],
    presetParams: {
      minDiameterMicrons: 10,
      maxDiameterMicrons: 30,
      minCircularity: 0.60,
      blueDyeSensitivity: 42,
    },
    presetHemocytometer: {
      dilutionFactor: 2,
      largeSquaresCounted: 4,
      cultureVolumeMl: 5,
    }
  },
  {
    id: 'hemocytometer-grid',
    name: 'Neubauer Grid Standard',
    cellLine: 'Primary Human PBMC Culture',
    expectedViability: '88.5%',
    description: 'Precision hemocytometer field displaying Improved Neubauer triple boundary lines for testing SOP border counting rules.',
    diameterRange: [8, 15],
    presetParams: {
      minDiameterMicrons: 7,
      maxDiameterMicrons: 20,
      minCircularity: 0.70,
      blueDyeSensitivity: 48,
    },
    presetHemocytometer: {
      dilutionFactor: 2,
      largeSquaresCounted: 4,
      cultureVolumeMl: 8,
      gridOverlayEnabled: true,
      enforceBorderRule: true,
    }
  }
];

// Helper to generate a realistic synthetic microscope image
export function generateSyntheticMicroscopeImage(sampleId: string): string {
  const canvas = document.createElement('canvas');
  const width = 1000;
  const height = 800;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Background brightfield microscope illumination with slight vignetting
  const bgGrad = ctx.createRadialGradient(
    width / 2, height / 2, 80,
    width / 2, height / 2, width * 0.75
  );
  bgGrad.addColorStop(0, '#f8faf9');
  bgGrad.addColorStop(0.65, '#f0f3f1');
  bgGrad.addColorStop(1, '#dfe5e2');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle microscope optical noise
  const noiseCount = 1200;
  for (let i = 0; i < noiseCount; i++) {
    const nx = Math.random() * width;
    const ny = Math.random() * height;
    const radius = Math.random() * 1.5;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.4)' : 'rgba(180,195,190,0.15)';
    ctx.beginPath();
    ctx.arc(nx, ny, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Draw hemocytometer grid lines if applicable or subtle grid
  const hasStrongGrid = sampleId === 'hemocytometer-grid';
  drawHemocytometerChamberLines(ctx, width, height, hasStrongGrid ? 1.0 : 0.25);

  // 3. Define population based on sample
  let totalCellTarget = 85;
  let deadRatio = 0.08;
  let debrisCount = 12;
  let baseRadius = 14; // in pixels (~12-14 µm at 0.65 µm/px)
  let radiusSpread = 3;

  if (sampleId === 'cho-bioreactor') {
    totalCellTarget = 95;
    deadRatio = 0.24;
    debrisCount = 20;
    baseRadius = 16;
    radiusSpread = 4.5;
  } else if (sampleId === 'hela-cytotoxic') {
    totalCellTarget = 70;
    deadRatio = 0.62;
    debrisCount = 25;
    baseRadius = 18;
    radiusSpread = 5;
  } else if (sampleId === 'hemocytometer-grid') {
    totalCellTarget = 80;
    deadRatio = 0.12;
    debrisCount = 10;
    baseRadius = 12;
    radiusSpread = 2.5;
  }

  // Deterministic seed generation
  let seed = sampleId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 42);
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const cells: Array<{ x: number; y: number; r: number; isDead: boolean }> = [];

  // Generate non-overlapping / lightly clustered cells
  for (let i = 0; i < totalCellTarget; i++) {
    const isDead = random() < deadRatio;
    const r = baseRadius + (random() - 0.5) * 2 * radiusSpread;
    const margin = 50;
    const x = margin + random() * (width - margin * 2);
    const y = margin + random() * (height - margin * 2);

    cells.push({ x, y, r, isDead });
  }

  // Render cells
  cells.forEach(cell => {
    if (cell.isDead) {
      renderDeadCell(ctx, cell.x, cell.y, cell.r, random);
    } else {
      renderViableCell(ctx, cell.x, cell.y, cell.r, random);
    }
  });

  // Render Debris (irregular dye precipitate or dust)
  for (let i = 0; i < debrisCount; i++) {
    const dx = 40 + random() * (width - 80);
    const dy = 40 + random() * (height - 80);
    renderDebris(ctx, dx, dy, random);
  }

  return canvas.toDataURL('image/jpeg', 0.95);
}

// Draw realistic Neubauer Improved Grid etched on glass
function drawHemocytometerChamberLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opacity: number
) {
  ctx.save();
  ctx.strokeStyle = `rgba(100, 115, 125, ${opacity * 0.7})`;
  ctx.lineWidth = 1;

  // Center coordinate
  const cx = width / 2;
  const cy = height / 2;
  const squareSize = 240; // represents 1 mm square in pixels

  // Outer boundary
  ctx.strokeRect(cx - squareSize, cy - squareSize, squareSize * 2, squareSize * 2);

  // Triple lines representing Neubauer boundary dividing lines
  const offsets = [-1, 0, 1];
  [cx - squareSize / 2, cx, cx + squareSize / 2].forEach(lx => {
    offsets.forEach(off => {
      ctx.beginPath();
      ctx.moveTo(lx + off * 2, cy - squareSize);
      ctx.lineTo(lx + off * 2, cy + squareSize);
      ctx.stroke();
    });
  });

  [cy - squareSize / 2, cy, cy + squareSize / 2].forEach(ly => {
    offsets.forEach(off => {
      ctx.beginPath();
      ctx.moveTo(cx - squareSize, ly + off * 2);
      ctx.lineTo(cx + squareSize, ly + off * 2);
      ctx.stroke();
    });
  });

  // Corner squares subdivisions (4x4 small squares for RBC / WBC counting)
  const drawSubdivisions = (startX: number, startY: number, size: number) => {
    const sub = size / 4;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(startX + i * sub, startY);
      ctx.lineTo(startX + i * sub, startY + size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(startX, startY + i * sub);
      ctx.lineTo(startX + size, startY + i * sub);
      ctx.stroke();
    }
  };

  // Top-left square
  drawSubdivisions(cx - squareSize, cy - squareSize, squareSize);
  // Top-right square
  drawSubdivisions(cx, cy - squareSize, squareSize);
  // Bottom-left square
  drawSubdivisions(cx - squareSize, cy, squareSize);
  // Bottom-right square
  drawSubdivisions(cx, cy, squareSize);

  ctx.restore();
}

// Render a viable cell: translucent spherical body with bright refracted center and sharp dark Fresnel ring
function renderViableCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  random: () => number
) {
  ctx.save();

  // 1. Subtle soft shadow underneath
  ctx.fillStyle = 'rgba(120, 140, 150, 0.12)';
  ctx.beginPath();
  ctx.arc(x + 1, y + 1.5, r * 1.05, 0, Math.PI * 2);
  ctx.fill();

  // 2. Cell body gradient: bright in center, slight translucent warm-gray body
  const grad = ctx.createRadialGradient(
    x - r * 0.15, y - r * 0.15, r * 0.1,
    x, y, r
  );
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)'); // Refractive bright center
  grad.addColorStop(0.45, 'rgba(245, 248, 250, 0.85)');
  grad.addColorStop(0.78, 'rgba(220, 230, 235, 0.7)');
  grad.addColorStop(0.92, 'rgba(170, 185, 195, 0.85)');
  grad.addColorStop(1, 'rgba(80, 95, 110, 0.9)'); // Dark refractive phase halo

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // 3. Crisp refractive outer phase ring
  ctx.strokeStyle = 'rgba(65, 80, 95, 0.85)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Inner bright optical reflection spot (brightfield phase refraction)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.28, 0, Math.PI * 2);
  ctx.fill();

  // 5. Very subtle cytoplasmic organelles / nucleus shading
  if (random() > 0.4) {
    ctx.fillStyle = 'rgba(190, 205, 215, 0.35)';
    ctx.beginPath();
    ctx.arc(x + r * 0.15, y + r * 0.1, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Render a dead cell: dark blue/indigo stained with trypan blue penetration, lack of refringence
function renderDeadCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  random: () => number
) {
  ctx.save();

  // Dead cells often swell slightly or are slightly irregular
  const deadR = r * 1.08;

  // Stained cytoplasm gradient: intense indigo/cobalt blue core with dye accumulation
  const grad = ctx.createRadialGradient(
    x, y, deadR * 0.15,
    x, y, deadR
  );
  // Trypan blue optical signature: deep blue/violet core
  grad.addColorStop(0, 'rgba(20, 48, 110, 0.95)'); // Dense dark blue
  grad.addColorStop(0.4, 'rgba(32, 68, 138, 0.92)');
  grad.addColorStop(0.75, 'rgba(45, 92, 168, 0.88)');
  grad.addColorStop(0.95, 'rgba(28, 62, 126, 0.92)');
  grad.addColorStop(1, 'rgba(15, 38, 85, 0.85)'); // Diffuse membrane boundary

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, deadR, 0, Math.PI * 2);
  ctx.fill();

  // Granular stain texture inside dead cell
  for (let g = 0; g < 6; g++) {
    const gx = x + (random() - 0.5) * deadR * 1.1;
    const gy = y + (random() - 0.5) * deadR * 1.1;
    ctx.fillStyle = 'rgba(12, 28, 70, 0.6)';
    ctx.beginPath();
    ctx.arc(gx, gy, deadR * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  // Blurry/soft boundary rather than bright phase ring
  ctx.strokeStyle = 'rgba(25, 55, 115, 0.75)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, deadR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

// Render non-cellular debris or dye precipitate
function renderDebris(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  random: () => number
) {
  ctx.save();
  const isDyeCrystal = random() > 0.5;

  if (isDyeCrystal) {
    // Needle-like or crystalline trypan blue precipitate
    ctx.fillStyle = 'rgba(18, 42, 95, 0.85)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() * 8 + 4), y + (random() * 4 - 2));
    ctx.lineTo(x + (random() * 4 + 2), y + (random() * 8 + 3));
    ctx.closePath();
    ctx.fill();
  } else {
    // Amorphous cellular fragment or dust
    ctx.fillStyle = 'rgba(100, 115, 120, 0.5)';
    ctx.beginPath();
    ctx.ellipse(x, y, random() * 4 + 2, random() * 2 + 1, random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function generateBatchSampleItems(): Array<{ id: string; name: string; imageSrc: string }> {
  const batchDefinitions = [
    { id: 'batch-1', name: 'Jurkat_Culture_Rep1.jpg', sampleType: 'jurkat-healthy' },
    { id: 'batch-2', name: 'Jurkat_Culture_Rep2.jpg', sampleType: 'jurkat-healthy' },
    { id: 'batch-3', name: 'CHO_Bioreactor_Day4.jpg', sampleType: 'cho-bioreactor' },
    { id: 'batch-4', name: 'CHO_Bioreactor_Day6.jpg', sampleType: 'cho-bioreactor' },
    { id: 'batch-5', name: 'HeLa_Paclitaxel_24h.jpg', sampleType: 'hela-cytotoxic' },
    { id: 'batch-6', name: 'PBMC_Hemocytometer_Chamber.jpg', sampleType: 'hemocytometer-grid' }
  ];

  return batchDefinitions.map(def => ({
    id: def.id,
    name: def.name,
    imageSrc: generateSyntheticMicroscopeImage(def.sampleType)
  }));
}

