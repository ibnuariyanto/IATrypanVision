import React, { useRef } from 'react';
import { SAMPLE_DATASETS } from '../services/sampleImages';
import { SampleDataset } from '../types/cells';
import {
  Microscope,
  Upload,
  Sparkles,
  BookOpen,
  FileSpreadsheet,
  Printer,
  Camera,
  RefreshCw,
  Layers
} from 'lucide-react';

interface HeaderProps {
  currentSampleId: string;
  onSelectSample: (sample: SampleDataset) => void;
  onUploadImage: (file: File) => void;
  onOpenAiAnalysis: () => void;
  onOpenProtocolGuide: () => void;
  onExportCSV: () => void;
  onPrintReport: () => void;
  onReanalyze: () => void;
  isAnalyzing: boolean;
  viewMode: 'single' | 'batch';
  onToggleViewMode: (mode: 'single' | 'batch') => void;
  batchCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentSampleId,
  onSelectSample,
  onUploadImage,
  onOpenAiAnalysis,
  onOpenProtocolGuide,
  onExportCSV,
  onPrintReport,
  onReanalyze,
  isAnalyzing,
  viewMode,
  onToggleViewMode,
  batchCount
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage(file);
      // Reset input value so same file can be re-selected if desired
      e.target.value = '';
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
      {/* Top Banner & Main Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Assay Metadata */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Microscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
                TrypanVision
              </h1>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Trypan Blue Exclusion Assay
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-mono font-medium rounded-md bg-slate-100 text-slate-600">
                Neubauer ISO/GLP
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Automated brightfield cell counting, viability determination & hemocytometer analysis
            </p>
          </div>
        </div>

        {/* View Mode Switcher: Single vs Batch */}
        <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200">
          <button
            onClick={() => onToggleViewMode('single')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'single'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Microscope className="w-3.5 h-3.5" />
            <span>Single Field</span>
          </button>
          <button
            onClick={() => onToggleViewMode('batch')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'batch'
                ? 'bg-blue-600 text-white shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Batch Processing</span>
            {batchCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  viewMode === 'batch'
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {batchCount}
              </span>
            )}
          </button>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors border border-slate-200"
            title="Upload brightfield microscope image (JPG, PNG, TIFF)"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            Upload Image
          </button>

          <button
            onClick={onReanalyze}
            disabled={isAnalyzing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-md transition-colors border border-slate-200"
            title="Re-run computer vision detection"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isAnalyzing ? 'animate-spin' : ''}`} />
            Re-detect
          </button>

          <button
            onClick={onOpenAiAnalysis}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-xs"
            title="Run Gemini multimodal AI deep morphological analysis"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            AI Deep Inspection
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

          <button
            onClick={onExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-md transition-colors border border-slate-200"
            title="Export individual cell data to CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
            CSV
          </button>

          <button
            onClick={onPrintReport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-md transition-colors border border-slate-200"
            title="Print publication-grade laboratory report"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            Report
          </button>

          <button
            onClick={onOpenProtocolGuide}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            title="Trypan Blue assay protocol, standard SOP, and literature references"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            SOP Guide
          </button>
        </div>
      </div>

      {/* Quick-Try Example Bar (Mandatory Science Skill Principle) */}
      <div className="bg-slate-50 border-t border-slate-200/80 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
          <span className="font-semibold text-slate-600 whitespace-nowrap flex items-center gap-1">
            <Camera className="w-3.5 h-3.5 text-slate-500" />
            Quick-Try Samples:
          </span>
          <div className="flex items-center gap-2">
            {SAMPLE_DATASETS.map((sample) => {
              const isActive = currentSampleId === sample.id;
              return (
                <button
                  key={sample.id}
                  onClick={() => onSelectSample(sample)}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all font-medium flex items-center gap-1.5 border ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <span>{sample.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive
                        ? 'bg-blue-700 text-blue-100'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {sample.expectedViability}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};
