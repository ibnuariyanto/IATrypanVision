import { DetectedCell, CountingResults, HemocytometerConfig, CalibrationSettings } from '../types/cells';

export function exportCellsToCSV(
  cells: DetectedCell[],
  results: CountingResults,
  sampleName: string
): void {
  const headers = [
    'Cell_ID',
    'Classification',
    'Diameter_microns',
    'Confidence',
    'Circularity',
    'Blue_Dye_Score',
    'Core_Brightness',
    'Center_X_px',
    'Center_Y_px',
    'Radius_px',
    'Border_Excluded'
  ];

  const rows = cells.map(c => [
    c.id,
    c.type,
    c.diameterMicrons,
    c.confidence,
    c.circularity,
    c.blueChromaScore,
    c.coreBrightness,
    c.x,
    c.y,
    c.radius.toFixed(1),
    c.isBorderExcluded ? 'YES' : 'NO'
  ]);

  const metaRows = [
    ['# TrypanVision Cell Counting & Viability Report'],
    [`# Sample: ${sampleName}`],
    [`# Date: ${new Date().toISOString()}`],
    [`# Total Viability: ${results.viabilityPercent}%`],
    [`# Viable Concentration: ${results.viableConcentration} cells/mL`],
    [`# Total Concentration: ${results.totalConcentration} cells/mL`],
    [`# Total Cells Counted: ${results.totalCells} (Viable: ${results.viableCells}, Dead: ${results.deadCells}, Debris: ${results.debrisCount})`],
    [`# Mean Diameter: ${results.meanDiameterMicrons} ± ${results.stdDevDiameterMicrons} µm`],
    [`# Clumping Index: ${results.clumpingIndexPercent}%`],
    []
  ];

  const csvContent =
    metaRows.map(r => r.join(',')).join('\n') +
    headers.join(',') + '\n' +
    rows.map(r => r.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `trypan_cell_count_${sampleName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads annotated canvas rendering as high-res PNG image
 */
export function exportAnnotatedImage(
  sourceCanvas: HTMLCanvasElement,
  sampleName: string
): void {
  const link = document.createElement('a');
  link.download = `annotated_${sampleName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.png`;
  link.href = sourceCanvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

import { BatchItem, BatchSummaryStats } from '../types/cells';

/**
 * Exports summary table of all processed images in the batch to CSV
 */
export function exportBatchSummaryToCSV(
  items: BatchItem[],
  stats: BatchSummaryStats | null
): void {
  const headers = [
    'Sample_ID',
    'File_Name',
    'Status',
    'Viability_Percent',
    'Viable_Count',
    'Dead_Count',
    'Total_Count',
    'Debris_Count',
    'Viable_Concentration_cells_per_mL',
    'Total_Concentration_cells_per_mL',
    'Mean_Diameter_microns',
    'Clumping_Index_percent',
    'Processed_At'
  ];

  const rows = items.map(item => {
    const res = item.results;
    return [
      item.id,
      `"${item.name.replace(/"/g, '""')}"`,
      item.status,
      res ? res.viabilityPercent : 'N/A',
      res ? res.viableCells : 'N/A',
      res ? res.deadCells : 'N/A',
      res ? res.totalCells : 'N/A',
      res ? res.debrisCount : 'N/A',
      res ? res.viableConcentration : 'N/A',
      res ? res.totalConcentration : 'N/A',
      res ? res.meanDiameterMicrons : 'N/A',
      res ? res.clumpingIndexPercent : 'N/A',
      item.processedAt || 'N/A'
    ];
  });

  const metaRows = [
    ['# TrypanVision Batch Viability Summary Report'],
    [`# Generated: ${new Date().toISOString()}`],
    [`# Total Files: ${items.length}`],
    stats ? [`# Completed: ${stats.completedImages}/${stats.totalImages}`] : [],
    stats ? [`# Mean Viability: ${stats.meanViabilityPercent}% ± ${stats.sdViabilityPercent}% (CV: ${stats.cvViabilityPercent}%)`] : [],
    stats ? [`# Mean Viable Concentration: ${Math.round(stats.meanViableConcentration)} ± ${Math.round(stats.sdViableConcentration)} cells/mL`] : [],
    stats ? [`# Total Cells Counted Across Batch: ${stats.totalCellCount} (Viable: ${stats.totalViableCount}, Dead: ${stats.totalDeadCount})`] : [],
    stats ? [`# Overall Pooled Viability: ${stats.overallViabilityPercent}%`] : [],
    []
  ].filter(r => r.length > 0);

  const csvContent =
    metaRows.map(r => r.join(',')).join('\n') +
    headers.join(',') + '\n' +
    rows.map(r => r.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `trypan_batch_summary_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports all individual cells across all samples in the batch into a single combined CSV
 */
export function exportAllBatchCellsToCSV(items: BatchItem[]): void {
  const headers = [
    'Sample_Name',
    'Cell_ID',
    'Classification',
    'Diameter_microns',
    'Confidence',
    'Circularity',
    'Blue_Dye_Score',
    'Center_X_px',
    'Center_Y_px',
    'Radius_px',
    'Border_Excluded'
  ];

  const rows: Array<(string | number)[]> = [];
  items.forEach(item => {
    item.detectedCells.forEach(cell => {
      rows.push([
        `"${item.name.replace(/"/g, '""')}"`,
        cell.id,
        cell.type,
        cell.diameterMicrons,
        cell.confidence,
        cell.circularity,
        cell.blueChromaScore,
        cell.x,
        cell.y,
        cell.radius.toFixed(1),
        cell.isBorderExcluded ? 'YES' : 'NO'
      ]);
    });
  });

  const metaRows = [
    ['# TrypanVision Comprehensive Batch Cell Level Export'],
    [`# Generated: ${new Date().toISOString()}`],
    [`# Total Samples: ${items.length}`],
    [`# Total Cells: ${rows.length}`],
    []
  ];

  const csvContent =
    metaRows.map(r => r.join(',')).join('\n') +
    headers.join(',') + '\n' +
    rows.map(r => r.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `trypan_all_cells_batch_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

