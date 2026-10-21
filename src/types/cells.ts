/**
 * Trypan Blue Cell Counting & Viability Types
 */

export type CellType = 'viable' | 'dead' | 'debris';

export interface DetectedCell {
  id: string;
  x: number; // pixel x coordinate in natural image
  y: number; // pixel y coordinate in natural image
  radius: number; // pixel radius
  diameterMicrons: number; // calibrated diameter in µm
  type: CellType;
  confidence: number;
  circularity: number; // 0 to 1
  blueChromaScore: number; // dye absorption intensity
  coreBrightness: number; // refractive brightness in center
  isBorderExcluded?: boolean; // excluded by hemocytometer boundary rules (e.g. bottom/right)
  manual?: boolean; // manually added or modified by user
}

export interface CalibrationSettings {
  micronsPerPixel: number; // e.g. 0.65 µm/px at 10x, 0.325 at 20x
  objective: '10x' | '20x' | '40x' | 'custom';
}

export interface DetectionParameters {
  minDiameterMicrons: number; // e.g. 6 µm
  maxDiameterMicrons: number; // e.g. 35 µm
  minCircularity: number; // 0.0 to 1.0 (filter irregular debris)
  blueDyeSensitivity: number; // 0 to 100 (threshold for dead vs live)
  brightnessSensitivity: number; // 0 to 100
  clusterDeconvolution: boolean; // separate clumped cells
}

export interface HemocytometerConfig {
  chamberType: 'Improved Neubauer' | 'Bürker-Türk' | 'Thoma' | 'Automated Slide';
  chamberDepthMm: number; // typically 0.1 mm
  largeSquaresCounted: number; // typically 4 or 5
  dilutionFactor: number; // typically 2x (1:1 with 0.4% trypan blue)
  cultureVolumeMl: number; // original suspension volume in mL
  enforceBorderRule: boolean; // include top/left, exclude bottom/right
  gridOverlayEnabled: boolean;
}

export interface CountingResults {
  totalCells: number;
  viableCells: number;
  deadCells: number;
  debrisCount: number;
  viabilityPercent: number; // 0 - 100
  viableConcentration: number; // cells/mL
  totalConcentration: number; // cells/mL
  totalViableYield: number; // total cells in culture volume
  meanDiameterMicrons: number;
  stdDevDiameterMicrons: number;
  clumpingIndexPercent: number;
}

export interface SampleDataset {
  id: string;
  name: string;
  cellLine: string;
  expectedViability: string;
  description: string;
  diameterRange: [number, number];
  presetParams: Partial<DetectionParameters>;
  presetHemocytometer: Partial<HemocytometerConfig>;
}

export interface BatchItem {
  id: string;
  name: string;
  file?: File;
  imageSrc: string;
  thumbnailSrc?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
  detectedCells: DetectedCell[];
  results?: CountingResults;
  processedAt?: string;
}

export interface BatchSummaryStats {
  totalImages: number;
  completedImages: number;
  meanViabilityPercent: number;
  sdViabilityPercent: number;
  cvViabilityPercent: number;
  meanViableConcentration: number;
  sdViableConcentration: number;
  totalViableCount: number;
  totalDeadCount: number;
  totalCellCount: number;
  overallViabilityPercent: number;
  meanDiameterMicrons: number;
  meanClumpingPercent: number;
}

