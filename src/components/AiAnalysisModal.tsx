import React, { useState } from 'react';
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Activity,
  Layers,
  Info,
  Loader2
} from 'lucide-react';

interface AiAnalysisResult {
  viableCount: number;
  deadCount: number;
  debrisCount: number;
  viabilityPercent: number;
  clumpingPercent: number;
  meanDiameterMicrons: number;
  morphologyNotes: string;
  qualityAssessment: string;
  recommendedAction: string;
}

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  sampleName: string;
  cellLine: string;
  onApplyAiCounts?: (viable: number, dead: number) => void;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  sampleName,
  cellLine,
  onApplyAiCounts
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/analyze-cells-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageSrc,
          cellType: cellLine || sampleName,
          chamberType: 'Improved Neubauer Hemocytometer'
        })
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.message || json.error || 'AI analysis request failed');
      }

      if (json.data) {
        setResult(json.data);
      } else {
        throw new Error('Unexpected response structure from AI model');
      }
    } catch (err: any) {
      console.error('AI Analysis failed:', err);
      setError(err.message || 'Failed to complete AI morphological analysis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/30 rounded-lg">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Gemini AI Deep Morphological Cytometry
              </h2>
              <p className="text-xs text-indigo-200">
                Multimodal AI inspection for cell boundary deconvolution & dye uptake verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Metadata pill */}
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <span className="font-semibold text-slate-700">Sample:</span> {sampleName}
            </div>
            <div>
              <span className="font-semibold text-slate-700">Culture:</span> {cellLine}
            </div>
          </div>

          {!result && !loading && !error && (
            <div className="text-center py-8 px-4 space-y-4">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Ready for AI Vision Examination
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                  Gemini multimodal vision will evaluate the microscope field for membrane integrity, phase refringence halos, apoptotic blebbing, and dye precipitation artifacts.
                </p>
              </div>
              <button
                onClick={handleRunAnalysis}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-all inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Run AI Deep Analysis
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                Evaluating cell morphology with Gemini Vision...
              </p>
              <p className="text-xs text-slate-400">
                Deconvolving cell clusters and classifying trypan blue dye uptake
              </p>
            </div>
          )}

          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 text-slate-700">
              <div className="flex items-center gap-2 text-amber-800 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                AI Analysis Notice
              </div>
              <p className="text-xs leading-relaxed">{error}</p>
              <div className="bg-white p-2.5 rounded border border-amber-200 text-[11px] text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">To enable Gemini Vision analysis:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Open <strong>Settings</strong> (gear icon in the top right).</li>
                  <li>Go to the <strong>Secrets</strong> tab.</li>
                  <li>Add or configure <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-700">GEMINI_API_KEY</code>.</li>
                </ol>
                <p className="text-slate-500 pt-1">
                  Note: The built-in client-side Computer Vision engine is 100% active and calculating viability in real-time.
                </p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-in fade-in">
              {/* Quantitative Metrics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                  <span className="text-[10px] font-semibold text-emerald-800 uppercase block">
                    AI Viability Score
                  </span>
                  <div className="text-2xl font-bold font-mono text-emerald-700 my-0.5">
                    {result.viabilityPercent}%
                  </div>
                  <span className="text-[10px] text-emerald-600 font-mono">
                    {result.viableCount} live / {result.deadCount} dead
                  </span>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-center">
                  <span className="text-[10px] font-semibold text-indigo-800 uppercase block">
                    Mean Diameter
                  </span>
                  <div className="text-2xl font-bold font-mono text-indigo-700 my-0.5">
                    {result.meanDiameterMicrons} µm
                  </div>
                  <span className="text-[10px] text-indigo-600">
                    Clumping: {result.clumpingPercent}%
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                  <span className="text-[10px] font-semibold text-slate-700 uppercase block">
                    Artifacts / Debris
                  </span>
                  <div className="text-2xl font-bold font-mono text-slate-800 my-0.5">
                    {result.debrisCount}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Non-cellular particles
                  </span>
                </div>
              </div>

              {/* Morphology Notes */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Activity className="w-3.5 h-3.5 text-indigo-600" />
                  Cytoplasmic & Membrane Morphology:
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {result.morphologyNotes}
                </p>
              </div>

              {/* Quality Assessment */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Illumination & Staining Quality:
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {result.qualityAssessment}
                </p>
              </div>

              {/* Biological Recommendation */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 space-y-1">
                <span className="font-bold text-blue-900 flex items-center gap-1.5 text-xs">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  Recommended Action:
                </span>
                <p className="text-xs text-blue-800 leading-relaxed">
                  {result.recommendedAction}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500">
            Model: Gemini 2.5 Flash Vision Cytometry
          </span>
          <div className="flex items-center gap-2">
            {result && onApplyAiCounts && (
              <button
                onClick={() => {
                  onApplyAiCounts(result.viableCount, result.deadCount);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
              >
                Apply AI Counts to Workspace
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
