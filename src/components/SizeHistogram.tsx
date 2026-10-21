import React from 'react';
import { DetectedCell, CountingResults } from '../types/cells';
import { BarChart3 } from 'lucide-react';

interface SizeHistogramProps {
  cells: DetectedCell[];
  results: CountingResults;
}

export const SizeHistogram: React.FC<SizeHistogramProps> = ({ cells, results }) => {
  // Only include counted cells (viable & dead)
  const validCells = cells.filter(c => !c.isBorderExcluded && c.type !== 'debris');

  // Compute bins from 5 µm to 35 µm with 1.5 µm step
  const minBin = 6;
  const maxBin = 32;
  const binStep = 1.5;
  const numBins = Math.ceil((maxBin - minBin) / binStep);

  const bins: Array<{
    binStart: number;
    binEnd: number;
    viableCount: number;
    deadCount: number;
    total: number;
  }> = [];

  for (let i = 0; i < numBins; i++) {
    const binStart = minBin + i * binStep;
    const binEnd = binStart + binStep;
    bins.push({
      binStart,
      binEnd,
      viableCount: 0,
      deadCount: 0,
      total: 0
    });
  }

  validCells.forEach(cell => {
    const d = cell.diameterMicrons;
    if (d >= minBin && d < maxBin) {
      const binIdx = Math.floor((d - minBin) / binStep);
      if (bins[binIdx]) {
        if (cell.type === 'viable') {
          bins[binIdx].viableCount++;
        } else if (cell.type === 'dead') {
          bins[binIdx].deadCount++;
        }
        bins[binIdx].total++;
      }
    }
  });

  const maxBinCount = Math.max(1, ...bins.map(b => b.total));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Cell Size Distribution (µm)
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
            Viable
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block" />
            Dead (Trypan Blue)
          </span>
        </div>
      </div>

      {/* SVG / HTML Bar Chart */}
      <div className="h-40 flex items-end gap-1 pt-4 pb-2 px-1 border-b border-slate-200 relative">
        {bins.map((bin, idx) => {
          const viableHeight = (bin.viableCount / maxBinCount) * 100;
          const deadHeight = (bin.deadCount / maxBinCount) * 100;

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col justify-end items-center h-full group relative"
            >
              {/* Tooltip on hover */}
              <div className="absolute -top-10 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-md z-30 pointer-events-none whitespace-nowrap">
                <span>{bin.binStart.toFixed(1)} - {bin.binEnd.toFixed(1)} µm</span>
                <span className="font-mono text-emerald-300">Live: {bin.viableCount} | Dead: {bin.deadCount}</span>
              </div>

              {/* Stacked bar */}
              <div className="w-full flex flex-col justify-end rounded-t-xs overflow-hidden h-full">
                {/* Dead bar top */}
                {bin.deadCount > 0 && (
                  <div
                    style={{ height: `${deadHeight}%` }}
                    className="w-full bg-blue-600 hover:bg-blue-700 transition-all"
                  />
                )}
                {/* Viable bar bottom */}
                {bin.viableCount > 0 && (
                  <div
                    style={{ height: `${viableHeight}%` }}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 transition-all"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1.5 px-1">
        <span>6 µm</span>
        <span>12 µm</span>
        <span>18 µm</span>
        <span>24 µm</span>
        <span>30 µm</span>
      </div>

      {/* Statistical summary footer */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center text-xs">
        <div className="bg-slate-50 p-1.5 rounded">
          <span className="text-[10px] text-slate-500 block">Mean Diameter</span>
          <span className="font-mono font-bold text-slate-800">
            {results.meanDiameterMicrons} µm
          </span>
        </div>
        <div className="bg-slate-50 p-1.5 rounded">
          <span className="text-[10px] text-slate-500 block">Std Deviation</span>
          <span className="font-mono font-bold text-slate-800">
            ± {results.stdDevDiameterMicrons} µm
          </span>
        </div>
        <div className="bg-slate-50 p-1.5 rounded">
          <span className="text-[10px] text-slate-500 block">Gated Count</span>
          <span className="font-mono font-bold text-slate-800">
            {validCells.length} cells
          </span>
        </div>
      </div>
    </div>
  );
};
