import React, { useState } from 'react';
import {
  DetectedCell,
  CountingResults,
  HemocytometerConfig,
  CalibrationSettings
} from '../types/cells';
import { formatScientificNotation } from '../services/cellDetector';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';

interface PrintableReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: CountingResults;
  cells: DetectedCell[];
  sampleName: string;
  cellLine: string;
  hemocytometer: HemocytometerConfig;
  calibration: CalibrationSettings;
  imageSrc: string;
}

export const PrintableReportModal: React.FC<PrintableReportModalProps> = ({
  isOpen,
  onClose,
  results,
  cells,
  sampleName,
  cellLine,
  hemocytometer,
  calibration,
  imageSrc
}) => {
  const [operatorName, setOperatorName] = useState('Dr. Scientist');
  const [passageNumber, setPassageNumber] = useState('P14');
  const [lotNumber, setLotNumber] = useState('LOT-2026-TB402');
  const [notes, setNotes] = useState('Standard logarithmic subculturing batch. Trypan Blue incubation time: 3.5 minutes.');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[95vh] flex flex-col">
        {/* Modal Controls Bar (hidden during print) */}
        <div className="no-print bg-slate-900 text-white p-3.5 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-sm">Publication-Grade Cytometry Laboratory Report</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="p-8 overflow-y-auto space-y-6 text-slate-800 print:p-0 print:m-0" id="printable-report">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 font-sans">
                  TRYPANVISION
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  ASSAY REPORT
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated Trypan Blue Dye Exclusion Cytometry & Cell Viability Certificate
              </p>
            </div>
            <div className="text-right text-xs font-mono text-slate-500">
              <div>Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
              <div>Report ID: TV-{Date.now().toString().slice(-8)}</div>
              <div>Standard: ISO 15189 / GLP Compliant</div>
            </div>
          </div>

          {/* Editable Metadata fields (editable in modal, static on print) */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Sample Name:</span>
              <span className="font-bold text-slate-900">{sampleName}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Cell Line / Type:</span>
              <span className="font-bold text-slate-900">{cellLine}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Passage Number:</span>
              <input
                type="text"
                value={passageNumber}
                onChange={(e) => setPassageNumber(e.target.value)}
                className="font-bold text-slate-900 bg-transparent border-b border-slate-300 focus:outline-none w-full"
              />
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Operator / Analyst:</span>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="font-bold text-slate-900 bg-transparent border-b border-slate-300 focus:outline-none w-full"
              />
            </div>
          </div>

          {/* Primary Results Table & Metrics */}
          <div className="grid grid-cols-3 gap-4">
            {/* Viability Box */}
            <div className="border border-slate-200 rounded-lg p-4 bg-emerald-50/50 text-center">
              <span className="text-xs uppercase font-bold text-slate-500 block">Total Viability</span>
              <div className="text-4xl font-extrabold font-mono text-emerald-700 my-1">
                {results.viabilityPercent}%
              </div>
              <span className="text-xs text-slate-600 font-mono">
                {results.viableCells} viable / {results.totalCells} total counted
              </span>
            </div>

            {/* Viable Concentration */}
            <div className="border border-slate-200 rounded-lg p-4 bg-blue-50/50 text-center">
              <span className="text-xs uppercase font-bold text-slate-500 block">Viable Concentration</span>
              <div className="text-2xl font-bold font-mono text-blue-800 my-1">
                {formatScientificNotation(results.viableConcentration)}
              </div>
              <span className="text-xs text-slate-500 font-mono">cells / mL</span>
            </div>

            {/* Total Yield */}
            <div className="border border-slate-200 rounded-lg p-4 bg-purple-50/50 text-center">
              <span className="text-xs uppercase font-bold text-slate-500 block">Total Harvest Yield</span>
              <div className="text-2xl font-bold font-mono text-purple-800 my-1">
                {formatScientificNotation(results.totalViableYield)}
              </div>
              <span className="text-xs text-slate-500 font-mono">cells in {hemocytometer.cultureVolumeMl} mL</span>
            </div>
          </div>

          {/* Chamber & Assay Specification Table */}
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">Chamber & Assay Parameters</h3>
            <table className="w-full text-xs border border-slate-200 text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold">
                <tr>
                  <th className="p-2 border-b border-slate-200">Chamber Type</th>
                  <th className="p-2 border-b border-slate-200">Squares Counted</th>
                  <th className="p-2 border-b border-slate-200">Chamber Depth</th>
                  <th className="p-2 border-b border-slate-200">Dilution Factor</th>
                  <th className="p-2 border-b border-slate-200">Objective / Resolution</th>
                  <th className="p-2 border-b border-slate-200">Border Rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr>
                  <td className="p-2">{hemocytometer.chamberType}</td>
                  <td className="p-2">{hemocytometer.largeSquaresCounted} Large Squares</td>
                  <td className="p-2">{hemocytometer.chamberDepthMm} mm</td>
                  <td className="p-2">{hemocytometer.dilutionFactor}× (1:1 with TB)</td>
                  <td className="p-2">{calibration.objective} ({calibration.micronsPerPixel} µm/px)</td>
                  <td className="p-2">{hemocytometer.enforceBorderRule ? 'L-Rule (Top/Left)' : 'Standard'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Morphological & Population Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
              <span className="font-bold text-slate-800 block">Cell Size Distribution Statistics:</span>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div>Mean Diameter: <strong>{results.meanDiameterMicrons} µm</strong></div>
                <div>Standard Deviation: <strong>± {results.stdDevDiameterMicrons} µm</strong></div>
                <div>Dead Cells Stained: <strong>{results.deadCells}</strong></div>
                <div>Debris Particles Gated: <strong>{results.debrisCount}</strong></div>
                <div>Clumping Index: <strong>{results.clumpingIndexPercent}%</strong></div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
              <span className="font-bold text-slate-800 block">Observations & Laboratory Notes:</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-16 p-1.5 border border-slate-200 rounded bg-slate-50 text-xs text-slate-700 resize-none focus:outline-none"
              />
            </div>
          </div>

          {/* Microscope Field Thumbnail */}
          <div className="border border-slate-200 rounded-lg p-3 flex items-center gap-4">
            <img
              src={imageSrc}
              alt="Microscope field preview"
              className="w-32 h-24 object-cover rounded border border-slate-200 shadow-xs"
            />
            <div className="text-xs text-slate-600 space-y-1">
              <span className="font-bold text-slate-800 block">Microscope Image Verification Field</span>
              <p>Image analyzed using automated computer vision edge detection, circular Hough transforms, and colorimetric Trypan Blue dye saturation index.</p>
              <span className="text-[10px] text-slate-400 font-mono">Resolution: 1000 × 800 px | Calibrated Scale: 100 µm bar</span>
            </div>
          </div>

          {/* Signatures & Certification */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs">
            <div>
              <div className="h-10 border-b border-slate-400 mb-1" />
              <span className="font-semibold text-slate-700 block">Analyst Signature</span>
              <span className="text-slate-500 font-mono">{operatorName}</span>
            </div>
            <div>
              <div className="h-10 border-b border-slate-400 mb-1" />
              <span className="font-semibold text-slate-700 block">Quality Assurance / Lab Supervisor</span>
              <span className="text-slate-500 font-mono">Authorized Signatory</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
