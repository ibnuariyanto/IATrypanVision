import React, { useState, useRef, useEffect } from 'react';
import {
  BatchItem,
  BatchSummaryStats,
  DetectionParameters,
  CalibrationSettings,
  HemocytometerConfig,
  DetectedCell
} from '../types/cells';
import {
  detectCellsFromImageData,
  calculateCountingResults,
  formatScientificNotation
} from '../services/cellDetector';
import {
  exportBatchSummaryToCSV,
  exportAllBatchCellsToCSV
} from '../services/reportGenerator';
import { generateBatchSampleItems } from '../services/sampleImages';
import {
  FolderUp,
  Files,
  Play,
  RotateCcw,
  FileSpreadsheet,
  Printer,
  Sparkles,
  ExternalLink,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  Search,
  Filter,
  Layers,
  Activity,
  Maximize2
} from 'lucide-react';

interface BatchProcessorViewProps {
  batchItems: BatchItem[];
  setBatchItems: React.Dispatch<React.SetStateAction<BatchItem[]>>;
  detectionParams: DetectionParameters;
  calibration: CalibrationSettings;
  hemocytometer: HemocytometerConfig;
  onOpenInViewer: (item: BatchItem) => void;
  onBackToSingleView: () => void;
}

export const BatchProcessorView: React.FC<BatchProcessorViewProps> = ({
  batchItems,
  setBatchItems,
  detectionParams,
  calibration,
  hemocytometer,
  onOpenInViewer,
  onBackToSingleView
}) => {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingIdx, setCurrentProcessingIdx] = useState<number>(-1);
  const [shouldStop, setShouldStop] = useState(false);

  // Table filters & sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [viabilityFilter, setViabilityFilter] = useState<'all' | 'high' | 'moderate' | 'low'>('all');
  const [sortField, setSortField] = useState<string>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Drag and drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Compute Batch Aggregated Statistics
  const completedItems = batchItems.filter(i => i.status === 'completed' && i.results);
  const stats: BatchSummaryStats | null = completedItems.length > 0 ? (() => {
    const viabilities = completedItems.map(i => i.results!.viabilityPercent);
    const concentrations = completedItems.map(i => i.results!.viableConcentration);
    const diameters = completedItems.map(i => i.results!.meanDiameterMicrons);
    const clumpings = completedItems.map(i => i.results!.clumpingIndexPercent);

    const totalViable = completedItems.reduce((acc, i) => acc + i.results!.viableCells, 0);
    const totalDead = completedItems.reduce((acc, i) => acc + i.results!.deadCells, 0);
    const totalCells = totalViable + totalDead;

    const meanViability = viabilities.reduce((a, b) => a + b, 0) / viabilities.length;
    const varViability = viabilities.reduce((a, b) => a + Math.pow(b - meanViability, 2), 0) / viabilities.length;
    const sdViability = Math.sqrt(varViability);
    const cvViability = meanViability > 0 ? (sdViability / meanViability) * 100 : 0;

    const meanConc = concentrations.reduce((a, b) => a + b, 0) / concentrations.length;
    const varConc = concentrations.reduce((a, b) => a + Math.pow(b - meanConc, 2), 0) / concentrations.length;
    const sdConc = Math.sqrt(varConc);

    const meanDiam = diameters.reduce((a, b) => a + b, 0) / diameters.length;
    const meanClump = clumpings.reduce((a, b) => a + b, 0) / clumpings.length;
    const overallViability = totalCells > 0 ? (totalViable / totalCells) * 100 : 0;

    return {
      totalImages: batchItems.length,
      completedImages: completedItems.length,
      meanViabilityPercent: Number(meanViability.toFixed(1)),
      sdViabilityPercent: Number(sdViability.toFixed(1)),
      cvViabilityPercent: Number(cvViability.toFixed(1)),
      meanViableConcentration: Math.round(meanConc),
      sdViableConcentration: Math.round(sdConc),
      totalViableCount: totalViable,
      totalDeadCount: totalDead,
      totalCellCount: totalCells,
      overallViabilityPercent: Number(overallViability.toFixed(1)),
      meanDiameterMicrons: Number(meanDiam.toFixed(1)),
      meanClumpingPercent: Number(meanClump.toFixed(1))
    };
  })() : null;

  // Process a single batch item using Canvas Computer Vision
  const processItem = async (item: BatchItem): Promise<BatchItem> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = item.imageSrc;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            resolve({
              ...item,
              status: 'error',
              errorMessage: 'Could not initialize canvas context'
            });
            return;
          }
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Run Computer Vision Detection
          const detectedCells = detectCellsFromImageData(
            imgData,
            detectionParams,
            calibration,
            hemocytometer
          );

          // Calculate Hemocytometer Results
          const results = calculateCountingResults(detectedCells, hemocytometer);

          resolve({
            ...item,
            status: 'completed',
            detectedCells,
            results,
            processedAt: new Date().toLocaleTimeString()
          });
        } catch (err: any) {
          resolve({
            ...item,
            status: 'error',
            errorMessage: err.message || 'Detection failed'
          });
        }
      };
      img.onerror = () => {
        resolve({
          ...item,
          status: 'error',
          errorMessage: 'Image could not be loaded'
        });
      };
    });
  };

  // Run Batch Processing Queue
  const runBatchAnalysis = async () => {
    if (batchItems.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setShouldStop(false);

    for (let i = 0; i < batchItems.length; i++) {
      if (shouldStop) break;
      setCurrentProcessingIdx(i);

      // Set item to processing
      setBatchItems(prev =>
        prev.map((item, idx) => (idx === i ? { ...item, status: 'processing' } : item))
      );

      // Small async tick for UI responsiveness
      await new Promise(r => setTimeout(r, 40));

      const processed = await processItem(batchItems[i]);

      setBatchItems(prev =>
        prev.map((item, idx) => (idx === i ? processed : item))
      );
    }

    setIsProcessing(false);
    setCurrentProcessingIdx(-1);
  };

  const handleStopProcessing = () => {
    setShouldStop(true);
    setIsProcessing(false);
  };

  // Upload Handlers
  const handleFilesUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: BatchItem[] = [];
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      alert('No valid image files found in selection.');
      return;
    }

    let loadedCount = 0;
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string;
        newItems.push({
          id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: file.webkitRelativePath || file.name,
          file,
          imageSrc,
          thumbnailSrc: imageSrc,
          status: 'pending',
          detectedCells: []
        });

        loadedCount++;
        if (loadedCount === imageFiles.length) {
          setBatchItems(prev => [...prev, ...newItems]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Load Example Batch Dataset
  const handleLoadSampleBatch = () => {
    const samples = generateBatchSampleItems();
    const items: BatchItem[] = samples.map(s => ({
      id: s.id,
      name: s.name,
      imageSrc: s.imageSrc,
      thumbnailSrc: s.imageSrc,
      status: 'pending',
      detectedCells: []
    }));
    setBatchItems(items);
  };

  // Clear batch
  const handleClearBatch = () => {
    if (isProcessing) handleStopProcessing();
    setBatchItems([]);
  };

  // Remove single item
  const handleRemoveItem = (id: string) => {
    setBatchItems(prev => prev.filter(i => i.id !== id));
  };

  // Re-run single item
  const handleRerunItem = async (item: BatchItem) => {
    setBatchItems(prev =>
      prev.map(i => (i.id === item.id ? { ...i, status: 'processing' } : i))
    );
    const processed = await processItem(item);
    setBatchItems(prev =>
      prev.map(i => (i.id === item.id ? processed : i))
    );
  };

  // Filter and Sort Table Items
  const filteredItems = batchItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (viabilityFilter === 'all') return true;
    if (!item.results) return false;
    const v = item.results.viabilityPercent;
    if (viabilityFilter === 'high') return v >= 80;
    if (viabilityFilter === 'moderate') return v >= 60 && v < 80;
    if (viabilityFilter === 'low') return v < 60;
    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    let valA: any = a.name;
    let valB: any = b.name;

    if (sortField === 'viability') {
      valA = a.results ? a.results.viabilityPercent : -1;
      valB = b.results ? b.results.viabilityPercent : -1;
    } else if (sortField === 'viableConc') {
      valA = a.results ? a.results.viableConcentration : -1;
      valB = b.results ? b.results.viableConcentration : -1;
    } else if (sortField === 'totalCells') {
      valA = a.results ? a.results.totalCells : -1;
      valB = b.results ? b.results.totalCells : -1;
    } else if (sortField === 'status') {
      valA = a.status;
      valB = b.status;
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const progressPercent = batchItems.length > 0
    ? (completedItems.length / batchItems.length) * 100
    : 0;

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Hidden file inputs */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-ignore - webkitdirectory is standard in Chromium/Firefox/Safari
        webkitdirectory="true"
        directory="true"
        className="hidden"
        onChange={(e) => {
          handleFilesUpload(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={filesInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFilesUpload(e.target.files);
          e.target.value = '';
        }}
      />

      {/* 1. Batch Control & Upload Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Batch Cell Viability Processor
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {batchItems.length} Images Loaded
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload a folder or select multiple microscope fields to perform automated Trypan Blue counting across replicates
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => folderInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition-colors"
            >
              <FolderUp className="w-3.5 h-3.5 text-blue-600" />
              Upload Folder
            </button>

            <button
              onClick={() => filesInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition-colors"
            >
              <Files className="w-3.5 h-3.5 text-blue-600" />
              Select Files
            </button>

            <button
              onClick={handleLoadSampleBatch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
              title="Load 6 pre-configured biological replicate images"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Load Sample Replicate Set
            </button>

            {batchItems.length > 0 && (
              <>
                <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

                {!isProcessing ? (
                  <button
                    onClick={runBatchAnalysis}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Run Batch Analysis ({batchItems.length})
                  </button>
                ) : (
                  <button
                    onClick={handleStopProcessing}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-md shadow-xs transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    Pause / Stop
                  </button>
                )}

                <button
                  onClick={handleClearBatch}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Clear all batch files"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Drag and Drop Zone if empty */}
        {batchItems.length === 0 && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingOver(false);
              handleFilesUpload(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              isDraggingOver
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                <FolderUp className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Drag & Drop a Folder or Multiple Microscope Images
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Supports JPG, PNG, TIFF, or BMP microscope captures. You can also click the buttons above to select your experimental folder.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={() => folderInputRef.current?.click()}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium shadow-xs"
                >
                  Browse Folder
                </button>
                <button
                  onClick={handleLoadSampleBatch}
                  className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium"
                >
                  Load 6 Example Images
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Processing Progress Bar */}
        {batchItems.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                {isProcessing && <RotateCcw className="w-3.5 h-3.5 text-blue-600 animate-spin" />}
                Batch Progress: {completedItems.length} of {batchItems.length} completed
              </span>
              <span className="font-mono text-slate-500 text-[11px]">
                {progressPercent.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
              <div
                className="bg-blue-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Statistical Aggregates Banner */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Card 1: Mean Viability */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
              <span className="flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                Mean Viability
              </span>
              <span className="text-[10px] font-mono text-slate-400">CV: {stats.cvViabilityPercent}%</span>
            </div>
            <div className="my-1.5">
              <div className="text-2xl font-black font-mono text-slate-900">
                {stats.meanViabilityPercent}%
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                ± {stats.sdViabilityPercent}% SD
              </div>
            </div>
            <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block font-medium">
              Pooled: {stats.overallViabilityPercent}%
            </div>
          </div>

          {/* Card 2: Mean Concentration */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between">
            <span className="text-slate-500 text-xs font-semibold uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              Viable Density
            </span>
            <div className="my-1.5">
              <div className="text-xl font-bold font-mono text-slate-900">
                {formatScientificNotation(stats.meanViableConcentration)}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                ± {formatScientificNotation(stats.sdViableConcentration)}
              </div>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              cells / mL
            </div>
          </div>

          {/* Card 3: Total Counted Cells */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between">
            <span className="text-slate-500 text-xs font-semibold uppercase flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              Total Cells Counted
            </span>
            <div className="my-1.5">
              <div className="text-2xl font-bold font-mono text-purple-800">
                {stats.totalCellCount.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {stats.totalViableCount.toLocaleString()} live / {stats.totalDeadCount.toLocaleString()} dead
              </div>
            </div>
            <div className="text-[10px] text-slate-400">
              Across {stats.completedImages} fields of view
            </div>
          </div>

          {/* Card 4: Mean Cell Diameter */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between">
            <span className="text-slate-500 text-xs font-semibold uppercase flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5 text-teal-600" />
              Mean Diameter
            </span>
            <div className="my-1.5">
              <div className="text-2xl font-bold font-mono text-slate-900">
                {stats.meanDiameterMicrons} µm
              </div>
              <div className="text-[11px] text-slate-500">
                Calibrated @ {calibration.micronsPerPixel} µm/px
              </div>
            </div>
            <div className="text-[10px] text-slate-400">
              Sizing consistent with standard culture
            </div>
          </div>

          {/* Card 5: Clumping Average */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between">
            <span className="text-slate-500 text-xs font-semibold uppercase flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Clumping Index
            </span>
            <div className="my-1.5">
              <div className="text-2xl font-bold font-mono text-slate-900">
                {stats.meanClumpingPercent}%
              </div>
              <div className="text-[11px] text-slate-500">
                Doublets / Clusters
              </div>
            </div>
            <div className={`text-[10px] font-medium ${stats.meanClumpingPercent > 15 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {stats.meanClumpingPercent > 15 ? 'Mild cell aggregation' : 'Good single cell dispersion'}
            </div>
          </div>
        </div>
      )}

      {/* 3. Summary Results Table */}
      {batchItems.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-0">
          {/* Table Header Filter Toolbar */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by file name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <select
                value={viabilityFilter}
                onChange={(e) => setViabilityFilter(e.target.value as any)}
                className="px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-700"
              >
                <option value="all">All Viabilities</option>
                <option value="high">High (≥80%)</option>
                <option value="moderate">Moderate (60-79%)</option>
                <option value="low">Low (&lt;60%)</option>
              </select>
            </div>

            {/* Batch Export Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportBatchSummaryToCSV(batchItems, stats)}
                disabled={completedItems.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md font-medium text-xs shadow-xs disabled:opacity-50"
                title="Download complete batch summary table as CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Export Summary CSV
              </button>

              <button
                onClick={() => exportAllBatchCellsToCSV(batchItems)}
                disabled={completedItems.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md font-medium text-xs shadow-xs disabled:opacity-50"
                title="Download every single detected cell with Sample_Name as CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                Export All Cells CSV
              </button>
            </div>
          </div>

          {/* The Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 select-none">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3 w-16 text-center">Preview</th>
                  <th
                    onClick={() => handleSort('name')}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center gap-1">
                      File / Sample Name
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-900 text-center"
                  >
                    <div className="flex items-center justify-center gap-1">
                      Status
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('viability')}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-900 text-center"
                  >
                    <div className="flex items-center justify-center gap-1">
                      Viability (%)
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('viableConc')}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-900 text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Viable Density
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('totalCells')}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-900 text-center"
                  >
                    <div className="flex items-center justify-center gap-1">
                      Count (Live / Dead)
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-center">Mean Size</th>
                  <th className="py-2.5 px-3 text-center">Clumping</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedItems.map((item, idx) => {
                  const res = item.results;
                  const v = res ? res.viabilityPercent : null;

                  let viabilityBadge = 'bg-slate-100 text-slate-500';
                  if (v !== null) {
                    if (v >= 80) viabilityBadge = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                    else if (v >= 60) viabilityBadge = 'bg-amber-50 text-amber-700 border border-amber-200';
                    else viabilityBadge = 'bg-red-50 text-red-700 border border-red-200';
                  }

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Index */}
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Thumbnail */}
                      <td className="py-2.5 px-3 text-center">
                        <img
                          src={item.thumbnailSrc || item.imageSrc}
                          alt={item.name}
                          className="w-10 h-8 object-cover rounded border border-slate-200 mx-auto shadow-2xs cursor-pointer hover:scale-110 transition-transform"
                          onClick={() => onOpenInViewer(item)}
                          title="Click to open in viewer"
                        />
                      </td>

                      {/* Name */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 max-w-xs truncate" title={item.name}>
                          {item.name}
                        </div>
                        {item.processedAt && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Processed at {item.processedAt}
                          </div>
                        )}
                        {item.errorMessage && (
                          <div className="text-[10px] text-red-600">
                            {item.errorMessage}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        {item.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Done
                          </span>
                        )}
                        {item.status === 'processing' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 animate-pulse">
                            <RotateCcw className="w-3 h-3 text-blue-600 animate-spin" />
                            Analyzing
                          </span>
                        )}
                        {item.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            Queued
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                            <XCircle className="w-3 h-3 text-red-600" />
                            Failed
                          </span>
                        )}
                      </td>

                      {/* Viability % */}
                      <td className="py-2.5 px-3 text-center">
                        {v !== null ? (
                          <span className={`inline-block font-mono font-bold text-xs px-2.5 py-0.5 rounded-full ${viabilityBadge}`}>
                            {v}%
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>

                      {/* Viable Density */}
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800">
                        {res ? (
                          <div>
                            <div>{formatScientificNotation(res.viableConcentration)}</div>
                            <span className="text-[10px] text-slate-400">cells/mL</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Count (Live / Dead) */}
                      <td className="py-2.5 px-3 text-center font-mono">
                        {res ? (
                          <div>
                            <span className="text-emerald-700 font-bold">{res.viableCells}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-blue-700 font-bold">{res.deadCells}</span>
                            <div className="text-[10px] text-slate-400">Total: {res.totalCells}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Mean Diameter */}
                      <td className="py-2.5 px-3 text-center font-mono">
                        {res ? (
                          <span>{res.meanDiameterMicrons} µm</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Clumping */}
                      <td className="py-2.5 px-3 text-center font-mono">
                        {res ? (
                          <span className={res.clumpingIndexPercent > 15 ? 'text-amber-600 font-medium' : 'text-slate-600'}>
                            {res.clumpingIndexPercent}%
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onOpenInViewer(item)}
                            className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Inspect in main microscope viewer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRerunItem(item)}
                            className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                            title="Re-run detection on this image"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove file from batch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Count */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>
              Showing {sortedItems.length} of {batchItems.length} items
            </span>
            <span className="font-mono text-[11px]">
              Neubauer Chamber (Dilution: {hemocytometer.dilutionFactor}×, {hemocytometer.largeSquaresCounted} squares)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
