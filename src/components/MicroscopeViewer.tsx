import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  DetectedCell,
  CalibrationSettings,
  HemocytometerConfig,
  CellType
} from '../types/cells';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  Grid,
  Hash,
  Download,
  PlusCircle,
  HelpCircle,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { exportAnnotatedImage } from '../services/reportGenerator';

interface MicroscopeViewerProps {
  imageSrc: string;
  cells: DetectedCell[];
  calibration: CalibrationSettings;
  hemocytometer: HemocytometerConfig;
  sampleName: string;
  onUpdateCell: (cellId: string, updates: Partial<DetectedCell>) => void;
  onDeleteCell: (cellId: string) => void;
  onAddCell: (x: number, y: number, type: CellType) => void;
  selectedCellId: string | null;
  onSelectCell: (cell: DetectedCell | null) => void;
}

export const MicroscopeViewer: React.FC<MicroscopeViewerProps> = ({
  imageSrc,
  cells,
  calibration,
  hemocytometer,
  sampleName,
  onUpdateCell,
  onDeleteCell,
  onAddCell,
  selectedCellId,
  onSelectCell
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Zoom & Pan state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Display toggles
  const [showMarkers, setShowMarkers] = useState(true);
  const [showGrid, setShowGrid] = useState(hemocytometer.gridOverlayEnabled);
  const [showLabels, setShowLabels] = useState(false);
  const [showBorderRule, setShowBorderRule] = useState(hemocytometer.enforceBorderRule);

  // Manual Add Mode
  const [addMode, setAddMode] = useState<CellType | null>(null);

  // Sync grid overlay state if changed from outside
  useEffect(() => {
    setShowGrid(hemocytometer.gridOverlayEnabled);
    setShowBorderRule(hemocytometer.enforceBorderRule);
  }, [hemocytometer.gridOverlayEnabled, hemocytometer.enforceBorderRule]);

  // Load image element
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      imgRef.current = img;
      renderCanvas();
    };
  }, [imageSrc]);

  // Re-render canvas whenever cells or toggles or viewport change
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imgRef.current;
    canvas.width = img.width;
    canvas.height = img.height;

    // 1. Draw base microscope image
    ctx.drawImage(img, 0, 0);

    // 2. Draw Hemocytometer Neubauer Chamber Grid Overlay if enabled
    if (showGrid) {
      renderHemocytometerOverlay(ctx, canvas.width, canvas.height, showBorderRule);
    }

    // 3. Draw Cell Markers
    if (showMarkers) {
      cells.forEach((cell) => {
        renderCellMarker(
          ctx,
          cell,
          cell.id === selectedCellId,
          showLabels,
          calibration.micronsPerPixel
        );
      });
    }

    // 4. Draw Scale Bar (calibrated)
    renderScaleBar(ctx, canvas.width, canvas.height, calibration.micronsPerPixel);
  }, [cells, selectedCellId, showMarkers, showGrid, showLabels, showBorderRule, calibration]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Handle canvas click for selecting cells or manual addition
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Convert client coords to canvas pixel coords taking CSS scale and pan into account
    const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (addMode) {
      onAddCell(Math.round(clickX), Math.round(clickY), addMode);
      setAddMode(null);
      return;
    }

    // Find clicked cell
    let clickedCell: DetectedCell | null = null;
    let minDistance = 20; // 20px hit tolerance

    for (const cell of cells) {
      const dist = Math.hypot(cell.x - clickX, cell.y - clickY);
      if (dist <= Math.max(cell.radius + 6, minDistance)) {
        clickedCell = cell;
        minDistance = dist;
      }
    }

    onSelectCell(clickedCell);
  };

  // Zoom controls
  const handleZoom = (delta: number) => {
    setScale((prev) => Math.min(4, Math.max(0.6, prev + delta)));
  };

  const handleResetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  // Pan controls
  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle click or space+click or drag on container
    if (e.button === 1 || e.altKey || e.shiftKey) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleExportAnnotated = () => {
    if (canvasRef.current) {
      exportAnnotatedImage(canvasRef.current, sampleName);
    }
  };

  const selectedCell = cells.find(c => c.id === selectedCellId);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col h-full">
      {/* Top Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Visibility Toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-slate-600 mr-1">Overlays:</span>
          <button
            onClick={() => setShowMarkers(!showMarkers)}
            className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors border ${
              showMarkers
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            <Eye className="w-3 h-3" />
            Cells ({cells.length})
          </button>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors border ${
              showGrid
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            <Grid className="w-3 h-3" />
            Neubauer Grid
          </button>

          <button
            onClick={() => setShowBorderRule(!showBorderRule)}
            className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors border ${
              showBorderRule
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
            title="SOP Inclusion/Exclusion Rule: count top & left borders, exclude bottom & right"
          >
            <HelpCircle className="w-3 h-3" />
            SOP Border Rules
          </button>

          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors border ${
              showLabels
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            <Hash className="w-3 h-3" />
            Diameters (µm)
          </button>
        </div>

        {/* Manual Add & View Tools */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center border border-slate-200 rounded bg-white overflow-hidden">
            <button
              onClick={() => setAddMode(addMode === 'viable' ? null : 'viable')}
              className={`px-2 py-1 flex items-center gap-1 font-medium transition-colors ${
                addMode === 'viable'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
              title="Click image to manually add a Viable Cell"
            >
              <PlusCircle className="w-3 h-3" />
              + Live
            </button>
            <div className="w-px h-4 bg-slate-200" />
            <button
              onClick={() => setAddMode(addMode === 'dead' ? null : 'dead')}
              className={`px-2 py-1 flex items-center gap-1 font-medium transition-colors ${
                addMode === 'dead'
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
              title="Click image to manually add a Dead Cell (Trypan Blue)"
            >
              <PlusCircle className="w-3 h-3" />
              + Dead
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          {/* Zoom Buttons */}
          <button
            onClick={() => handleZoom(0.25)}
            className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom(-0.25)}
            className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetView}
            className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
            title="Reset Zoom & Pan"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleExportAnnotated}
            className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1 font-medium"
            title="Download annotated high-resolution image"
          >
            <Download className="w-3 h-3" />
            PNG
          </button>
        </div>
      </div>

      {/* Interactive Canvas Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`relative flex-1 bg-slate-900 overflow-hidden flex items-center justify-center select-none ${
          addMode ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-default'
        }`}
        style={{ minHeight: '520px' }}
      >
        {/* Informative Banner if Add Mode is active */}
        {addMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-blue-600 text-white px-3 py-1 rounded-full text-xs shadow-lg animate-pulse flex items-center gap-1.5 font-medium">
            <PlusCircle className="w-3.5 h-3.5" />
            Click anywhere on the microscope image to place a {addMode} cell
          </div>
        )}

        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
          className="relative inline-block shadow-2xl"
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="max-w-none block"
          />
        </div>

        {/* Selected Cell Inspector Float */}
        {selectedCell && (
          <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200 p-3 shadow-lg text-xs max-w-xs animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                {selectedCell.type === 'viable' && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                {selectedCell.type === 'dead' && <XCircle className="w-3.5 h-3.5 text-blue-600" />}
                Cell #{selectedCell.id}
              </span>
              <button
                onClick={() => onSelectCell(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 my-2 text-[11px] font-mono text-slate-600">
              <div>Type: <span className="font-bold text-slate-900 uppercase">{selectedCell.type}</span></div>
              <div>Diameter: <span className="font-bold text-slate-900">{selectedCell.diameterMicrons} µm</span></div>
              <div>Circularity: <span className="text-slate-900">{selectedCell.circularity}</span></div>
              <div>Dye Score: <span className="text-slate-900">{selectedCell.blueChromaScore}</span></div>
              <div>Confidence: <span className="text-slate-900">{(selectedCell.confidence * 100).toFixed(0)}%</span></div>
              <div>Coordinates: <span className="text-slate-900">({selectedCell.x}, {selectedCell.y})</span></div>
            </div>

            {selectedCell.isBorderExcluded && (
              <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded px-2 py-1 text-[10px] my-1">
                Excluded from count by Neubauer border rule
              </div>
            )}

            {/* Classification Quick Actions */}
            <div className="flex items-center gap-1 pt-1 mt-1 border-t border-slate-100">
              <button
                onClick={() => onUpdateCell(selectedCell.id, { type: 'viable', isBorderExcluded: false })}
                className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${
                  selectedCell.type === 'viable'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Viable
              </button>
              <button
                onClick={() => onUpdateCell(selectedCell.id, { type: 'dead', isBorderExcluded: false })}
                className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${
                  selectedCell.type === 'dead'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                Dead
              </button>
              <button
                onClick={() => onUpdateCell(selectedCell.id, { type: 'debris' })}
                className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${
                  selectedCell.type === 'debris'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Debris
              </button>
              <button
                onClick={() => onDeleteCell(selectedCell.id)}
                className="p-1 rounded text-red-600 hover:bg-red-50 transition-colors"
                title="Delete Cell"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] shadow-sm flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-700 inline-block" />
            <span className="font-medium text-slate-700">Viable (Refringent)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-blue-800 inline-block" />
            <span className="font-medium text-slate-700">Non-viable (Trypan Blue)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-slate-400 inline-block" />
            <span className="font-medium text-slate-700">Debris</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Render marker for detected cell
function renderCellMarker(
  ctx: CanvasRenderingContext2D,
  cell: DetectedCell,
  isSelected: boolean,
  showLabels: boolean,
  umPerPx: number
) {
  const { x, y, radius, type, isBorderExcluded } = cell;

  ctx.save();

  // If excluded by border rule, show dashed / faded marker
  if (isBorderExcluded) {
    ctx.setLineDash([3, 3]);
    ctx.globalAlpha = 0.55;
  }

  if (type === 'viable') {
    // Green refringent marker
    ctx.strokeStyle = isSelected ? '#ffffff' : '#059669';
    ctx.lineWidth = isSelected ? 2.8 : 2;
    ctx.beginPath();
    ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
    ctx.stroke();

    // Small central crosshair
    ctx.fillStyle = isSelected ? '#ffffff' : '#10b981';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'dead') {
    // Blue dye absorption marker
    ctx.strokeStyle = isSelected ? '#ffffff' : '#2563eb';
    ctx.lineWidth = isSelected ? 2.8 : 2;
    ctx.beginPath();
    ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
    ctx.stroke();

    // Central "X" marker representing trypan blue stained dead cell
    const arm = Math.max(3, radius * 0.4);
    ctx.strokeStyle = isSelected ? '#ffffff' : '#1d4ed8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - arm, y - arm);
    ctx.lineTo(x + arm, y + arm);
    ctx.moveTo(x + arm, y - arm);
    ctx.lineTo(x - arm, y + arm);
    ctx.stroke();
  } else {
    // Debris marker
    ctx.strokeStyle = isSelected ? '#ffffff' : '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // Selected highlight aura
  if (isSelected) {
    ctx.setLineDash([]);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Show diameter / ID text label
  if (showLabels) {
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    const label = `${cell.diameterMicrons}µm`;
    ctx.strokeText(label, x + radius + 3, y + 3);
    ctx.fillText(label, x + radius + 3, y + 3);
  }

  ctx.restore();
}

// Render calibrated scale bar in bottom-right corner
function renderScaleBar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  umPerPx: number
) {
  ctx.save();
  const targetUm = 100; // 100 µm bar
  const barLengthPx = targetUm / umPerPx;

  const right = width - 40;
  const bottom = height - 25;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(right - barLengthPx - 15, bottom - 22, barLengthPx + 30, 30);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(right - barLengthPx, bottom);
  ctx.lineTo(right, bottom);
  // End ticks
  ctx.moveTo(right - barLengthPx, bottom - 4);
  ctx.lineTo(right - barLengthPx, bottom + 4);
  ctx.moveTo(right, bottom - 4);
  ctx.lineTo(right, bottom + 4);
  ctx.stroke();

  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(`${targetUm} µm`, right - barLengthPx / 2, bottom - 6);

  ctx.restore();
}

// Render Improved Neubauer Hemocytometer Chamber lines and inclusion/exclusion guides
function renderHemocytometerOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  showBorderRule: boolean
) {
  ctx.save();
  const cx = width / 2;
  const cy = height / 2;
  const squareSize = 240;

  // Outer border
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - squareSize, cy - squareSize, squareSize * 2, squareSize * 2);

  // Triple lines representing Neubauer boundary dividing lines
  [-1, 0, 1].forEach((off) => {
    ctx.strokeStyle = off === 0 ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.3)';
    ctx.lineWidth = 1;

    // Vertical triple divisions
    ctx.beginPath();
    ctx.moveTo(cx + off * 2, cy - squareSize);
    ctx.lineTo(cx + off * 2, cy + squareSize);
    ctx.stroke();

    // Horizontal triple divisions
    ctx.beginPath();
    ctx.moveTo(cx - squareSize, cy + off * 2);
    ctx.lineTo(cx + squareSize, cy + off * 2);
    ctx.stroke();
  });

  // Label squares A, B, C, D (4 large corner squares)
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = 'rgba(59, 130, 246, 0.85)';
  ctx.fillText('Square 1 (Top-L)', cx - squareSize + 10, cy - squareSize + 22);
  ctx.fillText('Square 2 (Top-R)', cx + 10, cy - squareSize + 22);
  ctx.fillText('Square 3 (Btm-L)', cx - squareSize + 10, cy + 22);
  ctx.fillText('Square 4 (Btm-R)', cx + 10, cy + 22);

  // If SOP border rule is active, highlight TOP/LEFT in green (INCLUDED) and BOTTOM/RIGHT in orange (EXCLUDED)
  if (showBorderRule) {
    ctx.lineWidth = 3.5;

    // Top border - INCLUDED (Green)
    ctx.strokeStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(cx - squareSize, cy - squareSize);
    ctx.lineTo(cx + squareSize, cy - squareSize);
    ctx.stroke();

    // Left border - INCLUDED (Green)
    ctx.beginPath();
    ctx.moveTo(cx - squareSize, cy - squareSize);
    ctx.lineTo(cx - squareSize, cy + squareSize);
    ctx.stroke();

    // Bottom border - EXCLUDED (Amber/Red)
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(cx - squareSize, cy + squareSize);
    ctx.lineTo(cx + squareSize, cy + squareSize);
    ctx.stroke();

    // Right border - EXCLUDED (Amber/Red)
    ctx.beginPath();
    ctx.moveTo(cx + squareSize, cy - squareSize);
    ctx.lineTo(cx + squareSize, cy + squareSize);
    ctx.stroke();

    // Legend badge in center
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(cx - 95, cy - 25, 190, 50);

    ctx.fillStyle = '#34d399';
    ctx.fillText('● Top/Left: INCLUDED in count', cx - 85, cy - 8);
    ctx.fillStyle = '#f87171';
    ctx.fillText('● Bottom/Right: EXCLUDED (SOP)', cx - 85, cy + 12);
  }

  ctx.restore();
}
