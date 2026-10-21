import React from 'react';
import {
  DetectionParameters,
  CalibrationSettings,
  HemocytometerConfig
} from '../types/cells';
import {
  Sliders,
  Scale,
  Grid,
  Filter,
  CheckCircle,
  HelpCircle,
  RotateCcw
} from 'lucide-react';

interface GatingControlsProps {
  params: DetectionParameters;
  onUpdateParams: (params: DetectionParameters) => void;
  calibration: CalibrationSettings;
  onUpdateCalibration: (calibration: CalibrationSettings) => void;
  hemocytometer: HemocytometerConfig;
  onUpdateHemocytometer: (hemocytometer: HemocytometerConfig) => void;
  onResetToDefaults: () => void;
}

export const GatingControls: React.FC<GatingControlsProps> = ({
  params,
  onUpdateParams,
  calibration,
  onUpdateCalibration,
  hemocytometer,
  onUpdateHemocytometer,
  onResetToDefaults
}) => {
  const handleObjectiveChange = (obj: CalibrationSettings['objective']) => {
    let micronsPerPixel = 0.65;
    if (obj === '20x') micronsPerPixel = 0.325;
    if (obj === '40x') micronsPerPixel = 0.1625;
    if (obj === 'custom') micronsPerPixel = calibration.micronsPerPixel;

    onUpdateCalibration({
      objective: obj,
      micronsPerPixel
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-5 text-xs">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-800">
            Gating & Hemocytometer Calibration
          </h2>
        </div>
        <button
          onClick={onResetToDefaults}
          className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors"
          title="Reset parameters to sample defaults"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* 1. Optical Objective Calibration */}
      <div>
        <label className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
          <Scale className="w-3.5 h-3.5 text-slate-500" />
          Microscope Objective & Pixel Calibration
        </label>
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {(['10x', '20x', '40x', 'custom'] as const).map((obj) => (
            <button
              key={obj}
              onClick={() => handleObjectiveChange(obj)}
              className={`py-1.5 rounded-md font-medium text-center border transition-all ${
                calibration.objective === obj
                  ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {obj === 'custom' ? 'Custom' : `${obj.toUpperCase()}`}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between text-slate-500 font-mono text-[11px] bg-slate-50 p-2 rounded border border-slate-200">
          <span>Scale factor:</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.01"
              value={calibration.micronsPerPixel}
              onChange={(e) =>
                onUpdateCalibration({
                  objective: 'custom',
                  micronsPerPixel: Math.max(0.01, parseFloat(e.target.value) || 0.65)
                })
              }
              className="w-16 px-1.5 py-0.5 border border-slate-300 rounded bg-white font-mono text-slate-800 text-right"
            />
            <span>µm / px</span>
          </div>
        </div>
      </div>

      {/* 2. Cell Size & Morphology Gating */}
      <div className="space-y-3 pt-1 border-t border-slate-100">
        <label className="font-semibold text-slate-700 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          Cell Size & Debris Gating
        </label>

        {/* Min Diameter */}
        <div>
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span>Min Cell Diameter:</span>
            <span className="font-mono font-bold text-slate-800">
              {params.minDiameterMicrons} µm
            </span>
          </div>
          <input
            type="range"
            min="4"
            max="20"
            step="0.5"
            value={params.minDiameterMicrons}
            onChange={(e) =>
              onUpdateParams({ ...params, minDiameterMicrons: parseFloat(e.target.value) })
            }
            className="w-full accent-blue-600 cursor-pointer"
          />
          <span className="text-[10px] text-slate-400">
            Smaller particles classified as non-cellular debris
          </span>
        </div>

        {/* Max Diameter */}
        <div>
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span>Max Cell Diameter:</span>
            <span className="font-mono font-bold text-slate-800">
              {params.maxDiameterMicrons} µm
            </span>
          </div>
          <input
            type="range"
            min="18"
            max="45"
            step="0.5"
            value={params.maxDiameterMicrons}
            onChange={(e) =>
              onUpdateParams({ ...params, maxDiameterMicrons: parseFloat(e.target.value) })
            }
            className="w-full accent-blue-600 cursor-pointer"
          />
        </div>

        {/* Circularity Gate */}
        <div>
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span>Min Circularity (Roundness):</span>
            <span className="font-mono font-bold text-slate-800">
              {params.minCircularity.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0.45"
            max="0.90"
            step="0.05"
            value={params.minCircularity}
            onChange={(e) =>
              onUpdateParams({ ...params, minCircularity: parseFloat(e.target.value) })
            }
            className="w-full accent-blue-600 cursor-pointer"
          />
          <span className="text-[10px] text-slate-400">
            Filters irregular cell debris, fibers, and dye precipitate
          </span>
        </div>

        {/* Blue Dye Sensitivity */}
        <div>
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span>Trypan Blue Dye Sensitivity:</span>
            <span className="font-mono font-bold text-blue-700">
              {params.blueDyeSensitivity}%
            </span>
          </div>
          <input
            type="range"
            min="20"
            max="80"
            step="1"
            value={params.blueDyeSensitivity}
            onChange={(e) =>
              onUpdateParams({ ...params, blueDyeSensitivity: parseInt(e.target.value, 10) })
            }
            className="w-full accent-blue-600 cursor-pointer"
          />
          <span className="text-[10px] text-slate-400">
            Threshold for trypan blue absorption (Live vs Dead classification)
          </span>
        </div>
      </div>

      {/* 3. Hemocytometer Configuration */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <label className="font-semibold text-slate-700 flex items-center gap-1.5">
          <Grid className="w-3.5 h-3.5 text-slate-500" />
          Hemocytometer Settings (Neubauer)
        </label>

        <div className="grid grid-cols-2 gap-2">
          {/* Squares Counted */}
          <div>
            <label className="text-[11px] text-slate-500 block mb-1">
              Large Squares Counted:
            </label>
            <select
              value={hemocytometer.largeSquaresCounted}
              onChange={(e) =>
                onUpdateHemocytometer({
                  ...hemocytometer,
                  largeSquaresCounted: parseInt(e.target.value, 10)
                })
              }
              className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-slate-800 font-mono"
            >
              <option value="1">1 Square (Quick)</option>
              <option value="2">2 Squares</option>
              <option value="4">4 Corner Squares (SOP)</option>
              <option value="5">5 Squares (4 corners + center)</option>
            </select>
          </div>

          {/* Dilution Factor */}
          <div>
            <label className="text-[11px] text-slate-500 block mb-1">
              Dilution Factor:
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                step="0.5"
                value={hemocytometer.dilutionFactor}
                onChange={(e) =>
                  onUpdateHemocytometer({
                    ...hemocytometer,
                    dilutionFactor: Math.max(1, parseFloat(e.target.value) || 2)
                  })
                }
                className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-slate-800 font-mono text-right"
              />
              <span className="font-mono text-slate-500">×</span>
            </div>
            <span className="text-[9px] text-slate-400">
              1:1 with trypan blue = 2×
            </span>
          </div>
        </div>

        {/* Culture Volume */}
        <div>
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span>Harvest Suspension Volume:</span>
            <span className="font-mono font-bold text-purple-700">
              {hemocytometer.cultureVolumeMl} mL
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={hemocytometer.cultureVolumeMl}
            onChange={(e) =>
              onUpdateHemocytometer({
                ...hemocytometer,
                cultureVolumeMl: parseInt(e.target.value, 10)
              })
            }
            className="w-full accent-purple-600 cursor-pointer"
          />
        </div>

        {/* SOP Border Rule Checkbox */}
        <label className="flex items-start gap-2 p-2 bg-slate-50 rounded border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
          <input
            type="checkbox"
            checked={hemocytometer.enforceBorderRule}
            onChange={(e) =>
              onUpdateHemocytometer({
                ...hemocytometer,
                enforceBorderRule: e.target.checked
              })
            }
            className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
          />
          <div className="text-[11px]">
            <span className="font-semibold text-slate-800 block">
              Enforce Neubauer Border Exclusion Rule
            </span>
            <span className="text-slate-500 leading-tight">
              Include cells touching top & left lines; exclude cells touching bottom & right lines (prevents double-counting).
            </span>
          </div>
        </label>
      </div>
    </div>
  );
};
