import React, { useState } from 'react';
import { CountingResults } from '../types/cells';
import { formatScientificNotation } from '../services/cellDetector';
import {
  Calculator,
  Pipette,
  AlertCircle,
  FlaskRound as Flask,
  Check
} from 'lucide-react';

interface SeedingCalculatorProps {
  results: CountingResults;
}

interface VesselPreset {
  id: string;
  name: string;
  defaultCellsPerWell: number;
  defaultVolumeMl: number;
}

const VESSEL_PRESETS: VesselPreset[] = [
  { id: '6-well', name: '6-Well Plate', defaultCellsPerWell: 300000, defaultVolumeMl: 2.0 },
  { id: '12-well', name: '12-Well Plate', defaultCellsPerWell: 150000, defaultVolumeMl: 1.0 },
  { id: '24-well', name: '24-Well Plate', defaultCellsPerWell: 80000, defaultVolumeMl: 0.5 },
  { id: '96-well', name: '96-Well Plate', defaultCellsPerWell: 10000, defaultVolumeMl: 0.1 },
  { id: 't25', name: 'T25 Flask', defaultCellsPerWell: 700000, defaultVolumeMl: 5.0 },
  { id: 't75', name: 'T75 Flask', defaultCellsPerWell: 2000000, defaultVolumeMl: 12.0 },
  { id: 'cryovial', name: 'Cryovial (Freezing)', defaultCellsPerWell: 2000000, defaultVolumeMl: 1.0 },
];

export const SeedingCalculator: React.FC<SeedingCalculatorProps> = ({ results }) => {
  const [selectedVessel, setSelectedVessel] = useState<string>('6-well');
  const [numVessels, setNumVessels] = useState<number>(6);
  const [customCellsPerWell, setCustomCellsPerWell] = useState<number>(300000);
  const [customVolumePerWell, setCustomVolumePerWell] = useState<number>(2.0);

  const activePreset = VESSEL_PRESETS.find(v => v.id === selectedVessel);

  const handleSelectPreset = (preset: VesselPreset) => {
    setSelectedVessel(preset.id);
    setCustomCellsPerWell(preset.defaultCellsPerWell);
    setCustomVolumePerWell(preset.defaultVolumeMl);
    if (preset.id === '96-well') setNumVessels(48);
    else if (preset.id === '6-well') setNumVessels(6);
    else if (preset.id === 't75') setNumVessels(2);
    else setNumVessels(4);
  };

  const viableConc = results.viableConcentration; // cells/mL
  const totalCellsNeeded = customCellsPerWell * numVessels;
  const totalCultureVolumeNeeded = customVolumePerWell * numVessels;

  // Stock suspension volume in mL
  const stockVolumeNeededMl = viableConc > 0 ? totalCellsNeeded / viableConc : 0;
  const stockVolumeNeededUl = stockVolumeNeededMl * 1000;
  const mediaVolumeNeededMl = Math.max(0, totalCultureVolumeNeeded - stockVolumeNeededMl);

  // Check if we have enough cells
  const isYieldSufficient = results.totalViableYield >= totalCellsNeeded;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">
            Passage & Seeding Volume Planner
          </h3>
        </div>
        <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          Stock: {formatScientificNotation(viableConc)} viable/mL
        </span>
      </div>

      {/* Preset Vessel Buttons */}
      <div>
        <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">
          Standard Culture Vessel Presets:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {VESSEL_PRESETS.map((p) => {
            const isSelected = selectedVessel === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`py-1.5 px-2 rounded-md font-medium text-left border transition-all ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px]">{p.name}</span>
                  {isSelected && <Check className="w-3 h-3 text-blue-600" />}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {formatScientificNotation(p.defaultCellsPerWell)}/well
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inputs for Seeding */}
      <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div>
          <label className="text-[11px] text-slate-600 block mb-1">
            Number of Wells/Flasks:
          </label>
          <input
            type="number"
            min="1"
            value={numVessels}
            onChange={(e) => setNumVessels(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-slate-800 font-mono"
          />
        </div>

        <div>
          <label className="text-[11px] text-slate-600 block mb-1">
            Target Cells / Vessel:
          </label>
          <input
            type="number"
            step="10000"
            value={customCellsPerWell}
            onChange={(e) => setCustomCellsPerWell(Math.max(100, parseInt(e.target.value) || 1000))}
            className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-slate-800 font-mono"
          />
        </div>

        <div>
          <label className="text-[11px] text-slate-600 block mb-1">
            Total Final Vol / Vessel (mL):
          </label>
          <input
            type="number"
            step="0.1"
            value={customVolumePerWell}
            onChange={(e) => setCustomVolumePerWell(Math.max(0.05, parseFloat(e.target.value) || 1))}
            className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-slate-800 font-mono"
          />
        </div>
      </div>

      {/* Pipetting Protocol Recipe */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-blue-900">
          <span className="flex items-center gap-1.5">
            <Pipette className="w-4 h-4 text-blue-600" />
            Pipetting Protocol Recipe:
          </span>
          <span className="font-mono text-[11px] text-blue-700">
            Total Target: {formatScientificNotation(totalCellsNeeded)} cells
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white p-2.5 rounded border border-blue-200">
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">
              1. Pipette Cell Suspension:
            </span>
            <div className="text-base font-bold font-mono text-blue-700 my-0.5">
              {stockVolumeNeededUl >= 1000
                ? `${(stockVolumeNeededUl / 1000).toFixed(2)} mL`
                : `${stockVolumeNeededUl.toFixed(1)} µL`}
            </div>
            <span className="text-[10px] text-slate-500">
              from current harvest tube
            </span>
          </div>

          <div className="bg-white p-2.5 rounded border border-blue-200">
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">
              2. Add Fresh Complete Media:
            </span>
            <div className="text-base font-bold font-mono text-slate-800 my-0.5">
              {mediaVolumeNeededMl.toFixed(2)} mL
            </div>
            <span className="text-[10px] text-slate-500">
              to achieve {totalCultureVolumeNeeded.toFixed(1)} mL master mix
            </span>
          </div>
        </div>

        {/* Aliquot Instruction */}
        <p className="text-[11px] text-blue-800 font-medium pt-1">
          Dispense <span className="font-mono font-bold">{customVolumePerWell} mL</span> of the mixed suspension into each of the <span className="font-bold">{numVessels}</span> vessels.
        </p>
      </div>

      {/* Sufficiency Warning */}
      {!isYieldSufficient && viableConc > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-800 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Insufficient Available Harvest Yield</span>
            Requested {formatScientificNotation(totalCellsNeeded)} cells, but current suspension contains only {formatScientificNotation(results.totalViableYield)} viable cells. Reduce vessel count or seed at lower density.
          </div>
        </div>
      )}
    </div>
  );
};
