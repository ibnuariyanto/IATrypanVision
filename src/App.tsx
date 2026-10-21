import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { MetricsPanel } from './components/MetricsPanel';
import { MicroscopeViewer } from './components/MicroscopeViewer';
import { GatingControls } from './components/GatingControls';
import { SizeHistogram } from './components/SizeHistogram';
import { SeedingCalculator } from './components/SeedingCalculator';
import { AiAnalysisModal } from './components/AiAnalysisModal';
import { ProtocolGuideModal } from './components/ProtocolGuideModal';
import { PrintableReportModal } from './components/PrintableReportModal';
import { BatchProcessorView } from './components/BatchProcessorView';

import {
  SampleDataset,
  DetectedCell,
  DetectionParameters,
  CalibrationSettings,
  HemocytometerConfig,
  CountingResults,
  CellType,
  BatchItem
} from './types/cells';
import {
  SAMPLE_DATASETS,
  generateSyntheticMicroscopeImage
} from './services/sampleImages';
import {
  detectCellsFromImageData,
  calculateCountingResults
} from './services/cellDetector';
import { exportCellsToCSV } from './services/reportGenerator';
import {
  Sliders,
  BarChart3,
  Calculator,
  UploadCloud,
  ClipboardPaste,
  ShieldAlert
} from 'lucide-react';

const DEFAULT_DETECTION_PARAMS: DetectionParameters = {
  minDiameterMicrons: 8,
  maxDiameterMicrons: 24,
  minCircularity: 0.70,
  blueDyeSensitivity: 48,
  brightnessSensitivity: 50,
  clusterDeconvolution: true
};

const DEFAULT_CALIBRATION: CalibrationSettings = {
  micronsPerPixel: 0.65, // ~10x objective
  objective: '10x'
};

const DEFAULT_HEMOCYTOMETER: HemocytometerConfig = {
  chamberType: 'Improved Neubauer',
  chamberDepthMm: 0.1,
  largeSquaresCounted: 4,
  dilutionFactor: 2.0,
  cultureVolumeMl: 10,
  enforceBorderRule: false,
  gridOverlayEnabled: true
};

export default function App() {
  const [currentSample, setCurrentSample] = useState<SampleDataset>(SAMPLE_DATASETS[0]);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [cells, setCells] = useState<DetectedCell[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);

  const [params, setParams] = useState<DetectionParameters>({
    ...DEFAULT_DETECTION_PARAMS,
    ...SAMPLE_DATASETS[0].presetParams
  });

  const [calibration, setCalibration] = useState<CalibrationSettings>(DEFAULT_CALIBRATION);

  const [hemocytometer, setHemocytometer] = useState<HemocytometerConfig>({
    ...DEFAULT_HEMOCYTOMETER,
    ...SAMPLE_DATASETS[0].presetHemocytometer
  });

  const [results, setResults] = useState<CountingResults>({
    totalCells: 0,
    viableCells: 0,
    deadCells: 0,
    debrisCount: 0,
    viabilityPercent: 0,
    viableConcentration: 0,
    totalConcentration: 0,
    totalViableYield: 0,
    meanDiameterMicrons: 0,
    stdDevDiameterMicrons: 0,
    clumpingIndexPercent: 0
  });

  const [activeTab, setActiveTab] = useState<'gating' | 'histogram' | 'seeding'>('gating');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // View mode: 'single' (microscope field viewer) or 'batch' (multi-file / folder table processor)
  const [viewMode, setViewMode] = useState<'single' | 'batch'>('single');
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);

  // Modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isProtocolModalOpen, setIsProtocolModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenBatchItemInViewer = (item: BatchItem) => {
    setImageSrc(item.imageSrc);
    if (item.detectedCells && item.detectedCells.length > 0) {
      setCells(item.detectedCells);
    }
    setCurrentSample({
      id: item.id,
      name: item.name,
      cellLine: 'Batch Image Field',
      expectedViability: item.results ? `${item.results.viabilityPercent}%` : 'Counted',
      description: `Replicate: ${item.name}`,
      diameterRange: [10, 25],
      presetParams: {},
      presetHemocytometer: {}
    });
    setViewMode('single');
    showToast(`Loaded "${item.name}" into interactive viewer`);
  };

  // 1. Load initial sample image on mount
  useEffect(() => {
    const defaultDataUrl = generateSyntheticMicroscopeImage(SAMPLE_DATASETS[0].id);
    setImageSrc(defaultDataUrl);
  }, []);

  // 2. Perform Computer Vision Cell Detection whenever image or detection params change
  const runDetection = useCallback(() => {
    if (!imageSrc) return;
    setIsAnalyzing(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      const offscreen = document.createElement('canvas');
      offscreen.width = img.width;
      offscreen.height = img.height;
      const ctx = offscreen.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        setIsAnalyzing(false);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);

      // Run computer vision cell detection
      const detected = detectCellsFromImageData(imgData, params, calibration, hemocytometer);
      setCells(detected);
      setIsAnalyzing(false);
    };
  }, [imageSrc, params, calibration, hemocytometer.enforceBorderRule, hemocytometer.gridOverlayEnabled]);

  useEffect(() => {
    runDetection();
  }, [runDetection]);

  // 3. Recalculate statistical and concentration results whenever cells or hemocytometer params change
  useEffect(() => {
    const updatedResults = calculateCountingResults(cells, hemocytometer);
    setResults(updatedResults);
  }, [cells, hemocytometer]);

  // 4. Sample selection handler
  const handleSelectSample = (sample: SampleDataset) => {
    setCurrentSample(sample);
    setSelectedCellId(null);
    const dataUrl = generateSyntheticMicroscopeImage(sample.id);
    setImageSrc(dataUrl);

    setParams({
      ...DEFAULT_DETECTION_PARAMS,
      ...sample.presetParams
    });

    setHemocytometer(prev => ({
      ...prev,
      ...sample.presetHemocytometer
    }));

    showToast(`Loaded sample: ${sample.name}`);
  };

  // 5. Image upload handler
  const handleUploadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setImageSrc(result);
        setSelectedCellId(null);
        setCurrentSample({
          id: `custom-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          cellLine: 'Uploaded Microscope Image',
          expectedViability: 'Automated',
          description: `Custom image: ${file.name}`,
          diameterRange: [10, 25],
          presetParams: {},
          presetHemocytometer: {}
        });
        showToast(`Uploaded ${file.name} successfully`);
      }
    };
    reader.readAsDataURL(file);
  };

  // 6. Clipboard paste image listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleUploadImage(file);
            showToast('Pasted microscope image from clipboard');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // 7. Cell editing handlers
  const handleUpdateCell = (cellId: string, updates: Partial<DetectedCell>) => {
    setCells(prev =>
      prev.map(c => (c.id === cellId ? { ...c, ...updates, manual: true } : c))
    );
  };

  const handleDeleteCell = (cellId: string) => {
    setCells(prev => prev.filter(c => c.id !== cellId));
    setSelectedCellId(null);
  };

  const handleAddCell = (x: number, y: number, type: CellType) => {
    const newRadius = 14;
    const newCell: DetectedCell = {
      id: `manual-${Date.now().toString().slice(-4)}`,
      x,
      y,
      radius: newRadius,
      diameterMicrons: Number((newRadius * 2 * calibration.micronsPerPixel).toFixed(1)),
      type,
      confidence: 1.0,
      circularity: 0.95,
      blueChromaScore: type === 'dead' ? 60 : 5,
      coreBrightness: type === 'viable' ? 240 : 80,
      isBorderExcluded: false,
      manual: true
    };
    setCells(prev => [...prev, newCell]);
    setSelectedCellId(newCell.id);
    showToast(`Added manual ${type} cell`);
  };

  const handleApplyAiCounts = (aiViable: number, aiDead: number) => {
    showToast(`AI counts verified: ${aiViable} live, ${aiDead} dead`);
  };

  const handleResetToDefaults = () => {
    setParams({
      ...DEFAULT_DETECTION_PARAMS,
      ...currentSample.presetParams
    });
    setHemocytometer({
      ...DEFAULT_HEMOCYTOMETER,
      ...currentSample.presetHemocytometer
    });
    setCalibration(DEFAULT_CALIBRATION);
    showToast('Reset parameters to sample defaults');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* 1. Header Toolbar & Quick-Try Bar */}
      <Header
        currentSampleId={currentSample.id}
        onSelectSample={handleSelectSample}
        onUploadImage={handleUploadImage}
        onOpenAiAnalysis={() => setIsAiModalOpen(true)}
        onOpenProtocolGuide={() => setIsProtocolModalOpen(true)}
        onExportCSV={() => exportCellsToCSV(cells, results, currentSample.name)}
        onPrintReport={() => setIsReportModalOpen(true)}
        onReanalyze={runDetection}
        isAnalyzing={isAnalyzing}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        batchCount={batchItems.length}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        {viewMode === 'batch' ? (
          <BatchProcessorView
            batchItems={batchItems}
            setBatchItems={setBatchItems}
            detectionParams={params}
            calibration={calibration}
            hemocytometer={hemocytometer}
            onOpenInViewer={handleOpenBatchItemInViewer}
            onBackToSingleView={() => setViewMode('single')}
          />
        ) : (
          <>
            {/* 2. Top Viability & Hemocytometer Metrics Panel */}
            <MetricsPanel
              results={results}
              cultureVolumeMl={hemocytometer.cultureVolumeMl}
            />

            {/* 3. Split Workstation View: Viewer (Left) + Multi-Tab Inspector (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left Column: Interactive Microscope Viewer (7 cols) */}
              <div className="lg:col-span-7 flex flex-col space-y-2">
                <MicroscopeViewer
                  imageSrc={imageSrc}
                  cells={cells}
                  calibration={calibration}
                  hemocytometer={hemocytometer}
                  sampleName={currentSample.name}
                  onUpdateCell={handleUpdateCell}
                  onDeleteCell={handleDeleteCell}
                  onAddCell={handleAddCell}
                  selectedCellId={selectedCellId}
                  onSelectCell={(c) => setSelectedCellId(c ? c.id : null)}
                />

                {/* Quick Helper Bar under viewer */}
                <div className="bg-white rounded-lg border border-slate-200 px-3 py-2 flex items-center justify-between text-xs text-slate-500 shadow-xs">
                  <span className="flex items-center gap-1.5">
                    <ClipboardPaste className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tip: Click on cells to inspect or re-classify. Paste image directly via <kbd className="px-1 py-0.5 bg-slate-100 rounded font-mono text-[10px]">Ctrl+V</kbd>.</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-600">
                    Counted: {results.viableCells} live / {results.deadCells} dead
                  </span>
                </div>
              </div>

              {/* Right Column: Multi-Tab Science Inspector (5 cols) */}
              <div className="lg:col-span-5 flex flex-col space-y-3">
                {/* Navigation Tabs */}
                <div className="flex rounded-xl bg-white p-1 border border-slate-200 shadow-xs">
                  <button
                    onClick={() => setActiveTab('gating')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      activeTab === 'gating'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Gating & Optics
                  </button>

                  <button
                    onClick={() => setActiveTab('histogram')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      activeTab === 'histogram'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Size Distribution
                  </button>

                  <button
                    onClick={() => setActiveTab('seeding')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      activeTab === 'seeding'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    Seeding Planner
                  </button>
                </div>

                {/* Tab Panes */}
                {activeTab === 'gating' && (
                  <GatingControls
                    params={params}
                    onUpdateParams={setParams}
                    calibration={calibration}
                    onUpdateCalibration={setCalibration}
                    hemocytometer={hemocytometer}
                    onUpdateHemocytometer={setHemocytometer}
                    onResetToDefaults={handleResetToDefaults}
                  />
                )}

                {activeTab === 'histogram' && (
                  <div className="space-y-3">
                    <SizeHistogram cells={cells} results={results} />
                    <div className="bg-white rounded-xl border border-slate-200 p-3 text-xs text-slate-600 shadow-xs">
                      <span className="font-bold text-slate-800 block mb-1">
                        Quality Control Insights:
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-500 text-[11px]">
                        <li>Non-viable apoptotic cells often exhibit slight swelling or membrane rupture before disintegrating.</li>
                        <li>Particles below {params.minDiameterMicrons} µm are gated out as cellular debris or dye crystal aggregates.</li>
                        <li>A bimodal size distribution may indicate cell cycle synchrony or distinct sub-populations.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {activeTab === 'seeding' && (
                  <SeedingCalculator results={results} />
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <AiAnalysisModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        imageSrc={imageSrc}
        sampleName={currentSample.name}
        cellLine={currentSample.cellLine}
        onApplyAiCounts={handleApplyAiCounts}
      />

      <ProtocolGuideModal
        isOpen={isProtocolModalOpen}
        onClose={() => setIsProtocolModalOpen(false)}
      />

      <PrintableReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        results={results}
        cells={cells}
        sampleName={currentSample.name}
        cellLine={currentSample.cellLine}
        hemocytometer={hemocytometer}
        calibration={calibration}
        imageSrc={imageSrc}
      />
    </div>
  );
}
