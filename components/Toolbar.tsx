
import React, { useState } from 'react';
import { 
  MousePointer2, 
  Pencil, 
  Highlighter, 
  Type, 
  StickyNote, 
  Square, 
  Circle, 
  Triangle,
  Diamond,
  Minus,
  MoveRight,
  Cylinder,
  Sparkles,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Plus,
  Shapes,
  Ban,
  ChevronDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical
} from 'lucide-react';
import { ToolType, BoardElement } from '../types';

interface ToolbarProps {
  activeTool: ToolType;
  selectedElements: BoardElement[];
  onSelectTool: (tool: ToolType) => void;
  onSummarize: () => void;
  onUploadImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isProcessing: boolean;
  
  // Configuration props
  penConfig: { color: string; width: number };
  markerConfig: { color: string; width: number };
  isConfigOpen: boolean;
  onConfigChange: (tool: 'pen' | 'highlighter', config: { color: string; width: number }) => void;
  onColorChange: (color: string) => void; // generic color change
  onElementUpdate: (id: string | null, updates: Partial<BoardElement>) => void;
  onAlign: (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
}

const COLORS = [
  { hex: '#000000', name: 'Black' },
  { hex: '#ef4444', name: 'Red' },
  { hex: '#3b82f6', name: 'Blue' },
  { hex: '#22c55e', name: 'Green' },
  { hex: '#eab308', name: 'Yellow' },
  { hex: '#a855f7', name: 'Purple' },
];

const FILL_COLORS = [
    { hex: 'transparent', name: 'None' },
    { hex: '#ffffff', name: 'White' },
    { hex: '#f3f4f6', name: 'Gray' },
    { hex: '#fecaca', name: 'Red' },
    { hex: '#bfdbfe', name: 'Blue' },
    { hex: '#bbf7d0', name: 'Green' },
    { hex: '#fef08a', name: 'Yellow' },
];

const NOTE_COLORS = [
    { hex: '#fef3c7', name: 'Yellow' },
    { hex: '#dbeafe', name: 'Blue' },
    { hex: '#dcfce7', name: 'Green' },
    { hex: '#fce7f3', name: 'Pink' },
    { hex: '#f3e8ff', name: 'Purple' },
    { hex: '#ffffff', name: 'White' },
    { hex: '#1f2937', name: 'Dark' }, 
];

const WIDTHS = [
  { value: 3, label: 'Thin' },
  { value: 6, label: 'Medium' },
  { value: 12, label: 'Thick' }
];

const HIGHLIGHTER_WIDTHS = [
    { value: 15, label: 'Thin' },
    { value: 25, label: 'Med' },
    { value: 40, label: 'Thick' }
  ];

const SHAPES = [
    { id: 'rect', icon: <Square size={18} />, label: 'Rectangle' },
    { id: 'circle', icon: <Circle size={18} />, label: 'Circle' },
    { id: 'triangle', icon: <Triangle size={18} />, label: 'Triangle' },
    { id: 'rhombus', icon: <Diamond size={18} />, label: 'Rhombus' },
    { id: 'arrow', icon: <MoveRight size={18} />, label: 'Arrow' },
    { id: 'line', icon: <Minus size={18} />, label: 'Line' },
    { id: 'cylinder', icon: <Cylinder size={18} />, label: 'Cylinder' },
];

const Toolbar: React.FC<ToolbarProps> = ({ 
  activeTool, 
  selectedElements,
  onSelectTool, 
  onSummarize,
  onUploadImage,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isProcessing,
  penConfig,
  markerConfig,
  isConfigOpen,
  onConfigChange,
  onColorChange,
  onElementUpdate,
  onAlign
}) => {
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);

  // Tools that are NOT shapes
  const mainTools: { id: ToolType; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <MousePointer2 size={20} />, label: 'Select' },
    { id: 'pen', icon: <Pencil size={20} />, label: 'Pen' },
    { id: 'highlighter', icon: <Highlighter size={20} />, label: 'Highlight' },
    { id: 'text', icon: <Type size={20} />, label: 'Text' },
    { id: 'sticky', icon: <StickyNote size={20} />, label: 'Note' },
  ];

  const selectedElement = selectedElements.length === 1 ? selectedElements[0] : null;
  const isMultiSelect = selectedElements.length > 1;

  const showPenControls = activeTool === 'pen';
  const showHighlighterControls = activeTool === 'highlighter';
  const isShapeSelected = selectedElement && ['rect', 'circle', 'triangle', 'rhombus', 'arrow', 'line', 'cylinder'].includes(selectedElement.type);
  const isStickySelected = selectedElement?.type === 'sticky';
  const isTextSelected = selectedElement?.type === 'text';
  
  const showContextControls = !!selectedElement && (isStickySelected || isTextSelected || isShapeSelected);
  const showAlignmentControls = selectedElements.length > 0;

  const handleFontSizeChange = (delta: number) => {
      if (!selectedElement || !selectedElement.fontSize) return;
      const newSize = Math.max(12, Math.min(128, (selectedElement.fontSize || 18) + delta));
      onElementUpdate(selectedElement.id, { fontSize: newSize });
  };

  const handleTextColorChange = (hex: string) => {
      if (!selectedElement) return;
      onElementUpdate(selectedElement.id, { textColor: hex });
  };
  
  const handleStrokeColorChange = (hex: string) => {
      if (!selectedElement) return;
      onElementUpdate(selectedElement.id, { strokeColor: hex });
  }

  const handleFillColorChange = (hex: string) => {
      if (!selectedElement) return;
      onElementUpdate(selectedElement.id, { fillColor: hex });
  }

  // Render options panel
  const renderOptions = () => {
    if (!isConfigOpen && !selectedElements.length) return null;

    if (showAlignmentControls && isMultiSelect) {
         return (
            <div className="absolute bottom-full left-0 mb-3 p-3 bg-white/90 backdrop-blur-xl border border-white/40 shadow-xl rounded-xl flex flex-col gap-3 min-w-[200px] animate-in slide-in-from-bottom-2">
                 <div className="text-xs font-medium text-gray-500 ml-1">Align Selected ({selectedElements.length})</div>
                 <div className="flex gap-2 justify-between">
                    <button onClick={() => onAlign('left')} className="p-2 hover:bg-gray-100 rounded" title="Align Left"><AlignLeft size={18} /></button>
                    <button onClick={() => onAlign('center')} className="p-2 hover:bg-gray-100 rounded" title="Align Center"><AlignCenter size={18} /></button>
                    <button onClick={() => onAlign('right')} className="p-2 hover:bg-gray-100 rounded" title="Align Right"><AlignRight size={18} /></button>
                    <div className="w-px bg-gray-200"></div>
                    <button onClick={() => onAlign('top')} className="p-2 hover:bg-gray-100 rounded" title="Align Top"><AlignStartVertical size={18} /></button>
                    <button onClick={() => onAlign('middle')} className="p-2 hover:bg-gray-100 rounded" title="Align Middle"><AlignCenterVertical size={18} /></button>
                    <button onClick={() => onAlign('bottom')} className="p-2 hover:bg-gray-100 rounded" title="Align Bottom"><AlignEndVertical size={18} /></button>
                 </div>
            </div>
         );
    }

    if (showContextControls && selectedElement) {
        const currentFillColor = selectedElement.fillColor || selectedElement.color || 'transparent';
        const currentStrokeColor = selectedElement.strokeColor || '#000000';
        const currentTextColor = selectedElement.textColor || '#1f2937';
        const fontSize = selectedElement.fontSize || (isTextSelected ? 24 : 18);

        return (
             <div className="absolute bottom-full left-0 mb-3 p-3 bg-white/90 backdrop-blur-xl border border-white/40 shadow-xl rounded-xl flex flex-col gap-3 min-w-[200px] animate-in slide-in-from-bottom-2">
                
                {/* Font Size Control */}
                {(isTextSelected || isStickySelected) && (
                    <div className="flex items-center justify-between gap-3 p-1 bg-gray-50 rounded-lg">
                        <button onClick={() => handleFontSizeChange(-2)} className="p-1 hover:bg-gray-200 rounded"><Minus size={16} /></button>
                        <span className="text-sm font-medium w-8 text-center">{fontSize}</span>
                        <button onClick={() => handleFontSizeChange(2)} className="p-1 hover:bg-gray-200 rounded"><Plus size={16} /></button>
                    </div>
                )}
                
                {/* Stroke Color (Shapes Only) */}
                {isShapeSelected && (
                    <>
                        <div className="text-xs font-medium text-gray-500 ml-1">Outline</div>
                        <div className="flex gap-2 flex-wrap">
                            {COLORS.map(c => (
                                <button 
                                    key={c.hex} 
                                    onClick={() => handleStrokeColorChange(c.hex)}
                                    className={`w-6 h-6 rounded-full border border-gray-200 shadow-sm ${currentStrokeColor === c.hex ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                                    style={{ backgroundColor: c.hex }}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* Fill Color (Sticky & Shapes) */}
                {(isShapeSelected || isStickySelected) && (
                    <>
                        <div className="h-px bg-gray-200"></div>
                        <div className="text-xs font-medium text-gray-500 ml-1">{isShapeSelected ? 'Fill' : 'Background'}</div>
                        <div className="flex gap-2 flex-wrap max-w-[180px]">
                            {(isStickySelected ? NOTE_COLORS : FILL_COLORS).map(c => (
                                <button 
                                    key={c.hex} 
                                    onClick={() => isStickySelected ? onColorChange(c.hex) : handleFillColorChange(c.hex)}
                                    className={`w-6 h-6 rounded-full border border-gray-200 shadow-sm flex items-center justify-center ${currentFillColor === c.hex ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                                    style={{ 
                                        backgroundColor: c.hex === 'transparent' ? 'transparent' : c.hex,
                                        backgroundImage: c.hex === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                                        backgroundSize: '8px 8px',
                                        backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                                    }}
                                    title={c.name}
                                >
                                    {c.hex === 'transparent' && <Ban size={12} className="text-red-500" />}
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* Text Color for Text/Sticky */}
                {(isTextSelected || isStickySelected) && (
                     <>
                        <div className="h-px bg-gray-200"></div>
                        <div className="text-xs font-medium text-gray-500 ml-1">Text Color</div>
                        <div className="flex gap-2 flex-wrap">
                             {COLORS.map(c => (
                                <button 
                                    key={c.hex} 
                                    onClick={() => isTextSelected ? onColorChange(c.hex) : handleTextColorChange(c.hex)}
                                    className={`w-6 h-6 rounded-full border border-gray-200 shadow-sm flex items-center justify-center ${ (isTextSelected ? selectedElement.color : currentTextColor) === c.hex ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                                    style={{ backgroundColor: c.hex }}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </>
                )}
             </div>
        );
    }

    if (!isConfigOpen) return null;

    if (showPenControls) {
        return (
            <div className="absolute bottom-full left-0 mb-3 p-3 bg-white/90 backdrop-blur-xl border border-white/40 shadow-xl rounded-xl flex flex-col gap-3 min-w-[150px] animate-in slide-in-from-bottom-2">
                <div className="flex gap-2 justify-between">
                    {COLORS.map(c => (
                        <button 
                            key={c.hex} 
                            onClick={() => onConfigChange('pen', { ...penConfig, color: c.hex })}
                            className={`w-6 h-6 rounded-full border border-gray-200 ${penConfig.color === c.hex ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                        />
                    ))}
                </div>
                <div className="h-px bg-gray-200"></div>
                <div className="flex gap-2 justify-between items-center">
                    {WIDTHS.map(w => (
                        <button
                            key={w.value}
                            onClick={() => onConfigChange('pen', { ...penConfig, width: w.value })}
                            className={`flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 ${penConfig.width === w.value ? 'bg-gray-200' : ''}`}
                            title={w.label}
                        >
                             <div className="bg-gray-800 rounded-full" style={{ width: w.value/2 + 2, height: w.value/2 + 2 }} />
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (showHighlighterControls) {
        return (
            <div className="absolute bottom-full left-0 mb-3 p-3 bg-white/90 backdrop-blur-xl border border-white/40 shadow-xl rounded-xl flex flex-col gap-3 min-w-[150px] animate-in slide-in-from-bottom-2">
                <div className="flex gap-2 justify-between">
                    {['#fde047', '#86efac', '#93c5fd', '#fca5a5', '#d8b4fe'].map(hex => (
                        <button 
                            key={hex} 
                            onClick={() => onConfigChange('highlighter', { ...markerConfig, color: hex })}
                            className={`w-6 h-6 rounded-full border border-gray-200 ${markerConfig.color === hex ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                            style={{ backgroundColor: hex }}
                        />
                    ))}
                </div>
                <div className="h-px bg-gray-200"></div>
                 <div className="flex gap-2 justify-between items-center">
                    {HIGHLIGHTER_WIDTHS.map(w => (
                        <button
                            key={w.value}
                            onClick={() => onConfigChange('highlighter', { ...markerConfig, width: w.value })}
                            className={`flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 ${markerConfig.width === w.value ? 'bg-gray-200' : ''}`}
                            title={w.label}
                        >
                             <div className="bg-gray-800/50 rounded-sm" style={{ width: 14, height: w.value/2 }} />
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return null;
  };

  const isAnyShapeActive = ['rect', 'circle', 'triangle', 'rhombus', 'arrow', 'line', 'cylinder'].includes(activeTool);
  const ActiveShapeIcon = SHAPES.find(s => s.id === activeTool)?.icon || <Shapes size={20} />;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center z-50">
      
      {renderOptions()}

      {/* Popover for Shapes */}
      {isShapeMenuOpen && (
          <div className="absolute bottom-full mb-3 bg-white/90 backdrop-blur-xl border border-white/40 shadow-xl rounded-xl p-2 grid grid-cols-4 gap-2 animate-in slide-in-from-bottom-2">
               {SHAPES.map(shape => (
                   <button
                        key={shape.id}
                        onClick={() => {
                            onSelectTool(shape.id as ToolType);
                            setIsShapeMenuOpen(false);
                        }}
                        className={`p-2 rounded-lg hover:bg-gray-100 ${activeTool === shape.id ? 'bg-blue-100 text-blue-600' : 'text-gray-700'}`}
                        title={shape.label}
                   >
                       {shape.icon}
                   </button>
               ))}
          </div>
      )}

      <div className="flex items-center gap-3 p-2 bg-white/80 backdrop-blur-2xl border border-white/40 shadow-2xl rounded-2xl transition-all duration-300">
        <div className="flex items-center gap-1 pr-3 border-r border-gray-200/50">
            {mainTools.map((tool) => (
            <button
                key={tool.id}
                onClick={() => {
                    onSelectTool(tool.id);
                    setIsShapeMenuOpen(false);
                }}
                className={`
                p-3 rounded-xl transition-all duration-200 group relative
                ${activeTool === tool.id 
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105' 
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}
                `}
                title={tool.label}
            >
                {tool.icon}
            </button>
            ))}

            {/* Combined Shapes Button */}
            <div className="relative">
                <button
                    onClick={() => setIsShapeMenuOpen(!isShapeMenuOpen)}
                    className={`
                    p-3 rounded-xl transition-all duration-200 group flex items-center gap-1
                    ${isAnyShapeActive
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105' 
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}
                    `}
                    title="Shapes"
                >
                    {ActiveShapeIcon}
                    <ChevronDown size={12} className="opacity-70" />
                </button>
            </div>

            <div className="relative p-3 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all cursor-pointer" title="Upload Image">
            <ImageIcon size={20} />
            <input 
                type="file" 
                accept="image/*" 
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={onUploadImage}
            />
            </div>
        </div>
        
        {/* Undo/Redo Section */}
        <div className="flex items-center gap-1 pr-3 border-r border-gray-200/50">
            <button 
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-3 rounded-xl transition-all ${!canUndo ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
            title="Undo (Ctrl+Z)"
            >
            <Undo2 size={20} />
            </button>
            <button 
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-3 rounded-xl transition-all ${!canRedo ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
            title="Redo (Ctrl+Y)"
            >
            <Redo2 size={20} />
            </button>
        </div>

        <button
            onClick={onSummarize}
            disabled={isProcessing}
            className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300
            ${isProcessing 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02]'}
            `}
        >
            <Sparkles size={18} className={isProcessing ? "animate-spin" : ""} />
            {isProcessing ? 'Thinking...' : 'AI Summary'}
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
