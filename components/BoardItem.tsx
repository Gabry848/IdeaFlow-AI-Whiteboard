
import React, { useRef, useEffect, useMemo } from 'react';
import { BoardElement, ResizeHandleDirection } from '../types';
import { RotateCw } from 'lucide-react';

interface BoardItemProps {
  element: BoardElement;
  isSelected: boolean;
  shouldShowHandles: boolean;
  isDrawingMode: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onChange: (id: string, newContent: string) => void;
  onResizeStart: (e: React.MouseEvent, direction: ResizeHandleDirection) => void;
  onRotateStart: (e: React.MouseEvent) => void;
}

const HANDLE_SIZE = 10;

const BoardItem: React.FC<BoardItemProps> = ({ 
  element, 
  isSelected, 
  shouldShowHandles, 
  isDrawingMode, 
  onSelect, 
  onChange, 
  onResizeStart, 
  onRotateStart 
}) => {
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Prevent overwrite if currently editing to avoid cursor jumps
    if (document.activeElement === textRef.current) return;
    if (textRef.current && textRef.current.innerText !== element.content) {
      textRef.current.innerText = element.content || '';
    }
  }, [element.content]);

  // Calculate the internal bounding box of points for drawings
  const svgViewBox = useMemo(() => {
    if ((element.type !== 'pen' && element.type !== 'highlighter') || !element.points || element.points.length === 0) {
      return undefined;
    }
    const maxX = Math.max(...element.points.map(p => p.x));
    const maxY = Math.max(...element.points.map(p => p.y));
    return `0 0 ${Math.max(maxX, 1)} ${Math.max(maxY, 1)}`;
  }, [element.points, element.type]);

  const commonStyles: React.CSSProperties = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    zIndex: element.zIndex,
    transform: `rotate(${element.rotation || 0}deg)`,
    cursor: isSelected ? 'move' : 'pointer',
    pointerEvents: isDrawingMode ? 'none' : 'auto', 
    touchAction: 'none',
  };

  // Improved selection visual
  const selectionClass = isSelected 
    ? "ring-2 ring-blue-500 ring-offset-2 shadow-xl bg-white/5" 
    : "hover:ring-1 hover:ring-gray-300 shadow-sm";

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    onChange(element.id, e.currentTarget.innerText);
  };

  // Render handles
  const renderHandles = () => {
    if (!isSelected || isDrawingMode || !shouldShowHandles) return null;
    const handles: { dir: ResizeHandleDirection; style: React.CSSProperties }[] = [
        { dir: 'nw', style: { top: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2, cursor: 'nw-resize' } },
        { dir: 'n', style: { top: -HANDLE_SIZE/2, left: '50%', marginLeft: -HANDLE_SIZE/2, cursor: 'n-resize' } },
        { dir: 'ne', style: { top: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2, cursor: 'ne-resize' } },
        { dir: 'w', style: { top: '50%', left: -HANDLE_SIZE/2, marginTop: -HANDLE_SIZE/2, cursor: 'w-resize' } },
        { dir: 'e', style: { top: '50%', right: -HANDLE_SIZE/2, marginTop: -HANDLE_SIZE/2, cursor: 'e-resize' } },
        { dir: 'sw', style: { bottom: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2, cursor: 'sw-resize' } },
        { dir: 's', style: { bottom: -HANDLE_SIZE/2, left: '50%', marginLeft: -HANDLE_SIZE/2, cursor: 's-resize' } },
        { dir: 'se', style: { bottom: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2, cursor: 'se-resize' } },
    ];

    return (
        <>
            {/* Resize Handles */}
            {handles.map(({ dir, style }) => (
                <div
                    key={dir}
                    style={{
                        ...style,
                        position: 'absolute',
                        width: HANDLE_SIZE,
                        height: HANDLE_SIZE,
                        backgroundColor: 'white',
                        border: '1px solid #3b82f6',
                        zIndex: 50,
                        borderRadius: '2px',
                    }}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        onResizeStart(e, dir);
                    }}
                />
            ))}

            {/* Rotation Handle */}
            <div 
                className="absolute w-6 h-6 flex items-center justify-center bg-white border border-blue-500 rounded-full shadow-md z-50 cursor-grab hover:bg-blue-50 active:cursor-grabbing"
                style={{
                    top: -30,
                    left: '50%',
                    marginLeft: -12,
                }}
                onMouseDown={(e) => {
                    e.stopPropagation();
                    onRotateStart(e);
                }}
                title="Rotate"
            >
                <RotateCw size={12} className="text-blue-500" />
            </div>
            {/* Connector line for rotation handle */}
            <div 
                className="absolute w-px h-4 bg-blue-500" 
                style={{ top: -15, left: '50%' }}
            />
        </>
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDrawingMode) return;
    onSelect(e);
  };

  // --- Shape Rendering Logic ---
  const renderShape = () => {
      const stroke = element.strokeColor || element.color || '#000000';
      const fill = element.fillColor || 'transparent';
      const strokeWidth = element.strokeWidth || 3;
      
      const w = element.width || 0;
      const h = element.height || 0;

      // Adjust for stroke width to prevent clipping
      const s = strokeWidth / 2; 

      switch (element.type) {
        case 'rect':
            return (
                <rect 
                    x={s} y={s} 
                    width={Math.max(0, w - strokeWidth)} 
                    height={Math.max(0, h - strokeWidth)} 
                    rx={8} ry={8}
                    stroke={stroke} strokeWidth={strokeWidth} fill={fill} 
                />
            );
        case 'circle': // Actually an ellipse in SVG terms if w != h
            return (
                <ellipse 
                    cx={w / 2} cy={h / 2} 
                    rx={Math.max(0, (w / 2) - s)} ry={Math.max(0, (h / 2) - s)} 
                    stroke={stroke} strokeWidth={strokeWidth} fill={fill} 
                />
            );
        case 'triangle':
            return (
                <polygon
                    points={`${w/2},${s} ${w-s},${h-s} ${s},${h-s}`}
                    stroke={stroke} strokeWidth={strokeWidth} fill={fill} 
                    strokeLinejoin="round"
                />
            );
        case 'rhombus': // Diamond
            return (
                <polygon
                    points={`${w/2},${s} ${w-s},${h/2} ${w/2},${h-s} ${s},${h/2}`}
                    stroke={stroke} strokeWidth={strokeWidth} fill={fill} 
                    strokeLinejoin="round"
                />
            );
        case 'line':
            return (
                <line 
                    x1={s} y1={h/2} 
                    x2={w-s} y2={h/2} 
                    stroke={stroke} strokeWidth={strokeWidth} 
                    strokeLinecap="round"
                />
            );
        case 'arrow':
             // Simple arrow pointing right
             const headSize = Math.min(w, h, 20); // Cap head size
             return (
                 <g stroke={stroke} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round">
                     <line x1={s} y1={h/2} x2={w-s} y2={h/2} />
                     <polyline points={`${w - headSize - s},${h/2 - headSize/2} ${w-s},${h/2} ${w - headSize - s},${h/2 + headSize/2}`} />
                 </g>
             );
        case 'cylinder':
            const ry = Math.min(h/6, 30);
            return (
                <g stroke={stroke} strokeWidth={strokeWidth} fill={fill}>
                    <path d={`M ${s},${h - ry - s} A ${w/2 - s},${ry} 0 0,0 ${w-s},${h - ry - s}`} />
                    <line x1={s} y1={ry+s} x2={s} y2={h-ry-s} />
                    <line x1={w-s} y1={ry+s} x2={w-s} y2={h-ry-s} />
                    <ellipse cx={w/2} cy={ry+s} rx={w/2 - s} ry={ry} />
                     <path 
                        d={`M ${s},${ry+s} L ${s},${h-ry-s} A ${w/2-s},${ry} 0 0,0 ${w-s},${h-ry-s} L ${w-s},${ry+s} A ${w/2-s},${ry} 0 0,0 ${s},${ry+s}`} 
                        stroke="none"
                        fill={fill}
                     />
                     <path d={`M ${s},${ry+s} L ${s},${h-ry-s} A ${w/2-s},${ry} 0 0,0 ${w-s},${h-ry-s} L ${w-s},${ry+s}`} fill="none" />
                     <ellipse cx={w/2} cy={ry+s} rx={w/2 - s} ry={ry} fill={fill} />
                </g>
            );
        default:
            return null;
      }
  };

  const renderContent = () => {
    const fontSize = element.fontSize ? `${element.fontSize}px` : undefined;

    switch (element.type) {
      case 'sticky':
        return (
          <div className="w-full h-full p-4 overflow-hidden flex flex-col">
            <div
                ref={textRef}
                contentEditable={!isDrawingMode}
                suppressContentEditableWarning
                onInput={handleInput}
                onMouseDown={(e) => !isDrawingMode && e.stopPropagation()} 
                className={`w-full h-full bg-transparent outline-none resize-none font-handwriting overflow-hidden leading-relaxed ${isDrawingMode ? 'cursor-crosshair' : 'cursor-text'}`}
                style={{ 
                    fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif',
                    fontSize: fontSize || '18px',
                    color: element.textColor || '#1f2937'
                }}
            />
          </div>
        );
      case 'text':
        return (
          <div className="w-full h-full p-2 overflow-hidden">
             <div
                ref={textRef}
                contentEditable={!isDrawingMode}
                suppressContentEditableWarning
                onInput={handleInput}
                onMouseDown={(e) => !isDrawingMode && e.stopPropagation()}
                className={`w-full h-full bg-transparent outline-none font-bold overflow-hidden ${isDrawingMode ? 'cursor-crosshair' : 'cursor-text'}`}
                style={{ 
                    fontSize: fontSize || '24px',
                    color: element.color || element.textColor || '#1f2937' 
                }}
            />
          </div>
        );
      case 'image':
        return (
             // eslint-disable-next-line @next/next/no-img-element
            <img src={element.content} alt="Content" className="w-full h-full object-cover pointer-events-none rounded-lg" />
        );
      case 'pen':
      case 'highlighter':
        return (
             <svg 
                width="100%" 
                height="100%" 
                viewBox={svgViewBox}
                preserveAspectRatio="none"
                style={{ overflow: 'visible' }}
             >
                <polyline
                    points={element.points?.map(p => `${p.x},${p.y}`).join(' ')}
                    stroke={element.color}
                    strokeWidth={element.strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={element.type === 'highlighter' ? 0.5 : 1}
                />
             </svg>
        );
      default:
        // Geometric Shapes
        return (
            <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                {renderShape()}
            </svg>
        );
    }
  };

  const getBackgroundColor = () => {
      if (element.type === 'sticky') return element.color || '#fef3c7';
      return 'transparent';
  };

  return (
      <div
          onMouseDown={handleMouseDown}
          onContextMenu={(e) => !isDrawingMode && onSelect(e)} 
          style={{ ...commonStyles, backgroundColor: getBackgroundColor() }}
          className={`group ${!isDrawingMode ? selectionClass : ''} ${element.type === 'sticky' ? 'shadow-md' : ''}`}
      >
          {renderContent()}
          {renderHandles()}
      </div>
  );
};

export default BoardItem;
