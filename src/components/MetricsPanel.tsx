import React from 'react';
import { CountingResults } from '../types/cells';
import { formatScientificNotation } from '../services/cellDetector';
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  FlaskConical,
  Scale
} from 'lucide-react';

interface MetricsPanelProps {
  results: CountingResults;
  cultureVolumeMl: number;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  results,
  cultureVolumeMl
}) => {
  // Determine viability health level
  const viability = results.viabilityPercent;
  let viabilityBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let viabilityLabel = 'High Viability';
  let viabilityRecommendation = 'Culture is in optimal logarithmic health. Suitable for passaging, transfection, or freezing.';

  if (viability < 60) {
    viabilityBadgeColor = 'bg-red-50 text-red-700 border-red-200';
    viabilityLabel = 'Low Viability';
    viabilityRecommendation = 'Culture is severely stressed or apoptotic. Do not passage or freeze without recovery.';
  } else if (viability < 80) {
    viabilityBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
    viabilityLabel = 'Moderate Viability';
    viabilityRecommendation = 'Acceptable for maintenance, but sub-optimal for sensitive transfection or cryopreservation.';
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {/* 1. Viability % Card */}
      <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            Viability Score
          </span>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${viabilityBadgeColor}`}>
            {viabilityLabel}
          </span>
        </div>

        <div className="flex items-baseline gap-3 my-2">
          <span className="text-4xl font-extrabold font-mono tracking-tight text-slate-900">
            {results.viabilityPercent}%
          </span>
          <span className="text-xs text-slate-500 font-mono">
            ({results.viableCells} live / {results.totalCells} total)
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
          <div
            className="bg-emerald-500 transition-all duration-500"
            style={{ width: `${results.viabilityPercent}%` }}
          />
          <div
            className="bg-blue-600 transition-all duration-500"
            style={{ width: `${100 - results.viabilityPercent}%` }}
          />
        </div>

        <p className="text-[11px] text-slate-500 mt-2 line-clamp-1">
          {viabilityRecommendation}
        </p>
      </div>

      {/* 2. Viable Concentration Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Viable Density
        </span>
        <div className="my-1">
          <div className="text-xl font-bold font-mono text-slate-900">
            {formatScientificNotation(results.viableConcentration)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono uppercase tracking-tight">
            cells / mL
          </div>
        </div>
        <div className="text-[11px] font-mono text-emerald-600 font-medium">
          {results.viableCells} cells counted
        </div>
      </div>

      {/* 3. Total Cell Concentration Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-slate-600" />
          Total Density
        </span>
        <div className="my-1">
          <div className="text-xl font-bold font-mono text-slate-900">
            {formatScientificNotation(results.totalConcentration)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono uppercase tracking-tight">
            cells / mL
          </div>
        </div>
        <div className="text-[11px] font-mono text-blue-600 font-medium">
          {results.deadCells} dead (blue stained)
        </div>
      </div>

      {/* 4. Total Culture Yield Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
          Harvest Yield
        </span>
        <div className="my-1">
          <div className="text-xl font-bold font-mono text-slate-900">
            {formatScientificNotation(results.totalViableYield)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono uppercase tracking-tight">
            total viable cells ({cultureVolumeMl} mL)
          </div>
        </div>
        <div className="text-[11px] text-slate-500">
          Suspension volume: {cultureVolumeMl} mL
        </div>
      </div>

      {/* 5. Cell Morphology & Size Stats Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Scale className="w-3.5 h-3.5 text-teal-600" />
          Cell Size & Clumps
        </span>
        <div className="my-1">
          <div className="text-lg font-bold font-mono text-slate-900">
            {results.meanDiameterMicrons} <span className="text-xs font-normal text-slate-500">± {results.stdDevDiameterMicrons} µm</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Mean diameter
          </div>
        </div>
        <div className="text-[11px] text-slate-500 flex items-center justify-between">
          <span>Clumping:</span>
          <span className={`font-mono font-medium ${results.clumpingIndexPercent > 15 ? 'text-amber-600' : 'text-slate-700'}`}>
            {results.clumpingIndexPercent}%
          </span>
        </div>
      </div>
    </div>
  );
};
