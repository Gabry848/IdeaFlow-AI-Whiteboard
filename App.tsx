
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import html2canvas from 'html2canvas';

import { BoardElement, ToolType, DragInfo, Point, ResizeInfo, ResizeHandleDirection, ViewTransform, ContextMenuState, RotateInfo } from './types';
import Toolbar from './components/Toolbar';
import BoardItem from './components/BoardItem';
import SummaryModal from './components/SummaryModal';
import ContextMenu from './components/ContextMenu';
import CommandPalette, { CommandOption } from './components/CommandPalette';
import { summarizeBoard } from './services/geminiService';
import { 
    MousePointer2, Pencil, Highlighter, Type, StickyNote, Shapes, 
    Sparkles, Download, Maximize, Trash2, Grid3X3, Copy, Undo2, Redo2, 
    ArrowUp, ArrowDown, XCircle, Image as ImageIcon
} from 'lucide-react';

const App: React.FC = () => {
  // --- History State ---
  const [history, setHistory] = useState<BoardElement[][]>([[]]);
  const [historyStep, setHistoryStep] = useState(0);

  // --- Main Board State ---
  const [elements, setElements] = useState<BoardElement[]>([]);
  
  // --- Tool Configuration State ---
  const [penConfig, setPenConfig] = useState({ color: '#1f2937', width: 3 });
  const [markerConfig, setMarkerConfig] = useState({ color: '#fde047', width: 25 });
  const [isConfigMenuOpen, setIsConfigMenuOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  // --- Command Palette State ---
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    setElements(history[historyStep]);
  }, [history, historyStep]);

  const addToHistory = (newElements: BoardElement[]) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [viewTransform, setViewTransform] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });

  // Creation State
  const [creationStart, setCreationStart] = useState<Point | null>(null);

  const [dragInfo, setDragInfo] = useState<DragInfo>({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialPositions: []
  });

  const [resizeInfo, setResizeInfo] = useState<ResizeInfo>({
    isResizing: false,
    handle: null,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    initialWidth: 0,
    initialHeight: 0
  });

  const [rotateInfo, setRotateInfo] = useState<RotateInfo>({
    isRotating: false,
    startX: 0,
    startY: 0,
    initialRotation: 0,
    centerX: 0,
    centerY: 0
  });
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    selectedIds: []
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---
  const isDrawingMode = activeTool === 'pen' || activeTool === 'highlighter';

  // --- Coordinate Helpers ---
  const screenToWorld = (screenX: number, screenY: number): Point => {
    return {
      x: (screenX - viewTransform.x) / viewTransform.scale,
      y: (screenY - viewTransform.y) / viewTransform.scale,
    };
  };

  const getMousePos = (e: React.MouseEvent | MouseEvent): Point => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return screenToWorld(x, y);
  };

  // --- Features ---

  const handleZoomToFit = () => {
    if (elements.length === 0) {
        setViewTransform({ x: 0, y: 0, scale: 1 });
        return;
    }
    
    // Calculate bounding box of all elements
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    elements.forEach(el => {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + (el.width || 0));
        maxY = Math.max(maxY, el.y + (el.height || 0));
    });

    const padding = 100;
    const w = maxX - minX + padding * 2;
    const h = maxY - minY + padding * 2;
    
    if (containerRef.current) {
        const { width: contW, height: contH } = containerRef.current.getBoundingClientRect();
        const scale = Math.min(contW / w, contH / h, 1.5); 
        
        const x = (contW - w * scale) / 2 - (minX - padding) * scale;
        const y = (contH - h * scale) / 2 - (minY - padding) * scale;

        setViewTransform({ x, y, scale });
    }
  };

  const handleExportPNG = async () => {
    if (!containerRef.current) return;
    
    setSelectedIds([]);
    setIsConfigMenuOpen(false);
    
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        const canvas = await html2canvas(containerRef.current, {
            backgroundColor: '#f3f4f6', 
            scale: 2, 
            ignoreElements: (element) => {
                return element.tagName === 'BUTTON' || element.classList.contains('fixed');
            }
        });
        
        const link = document.createElement('a');
        link.download = `mindcanvas-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    } catch (err) {
        console.error("Export failed:", err);
        alert("Could not export image.");
    }
  };

  const handleClearCanvas = () => {
    if (window.confirm("Are you sure you want to clear the entire whiteboard?")) {
        const newEls: BoardElement[] = [];
        setElements(newEls);
        addToHistory(newEls);
        setSelectedIds([]);
    }
  };

  const handleToggleGrid = () => {
      setShowGrid(prev => !prev);
  };

  // --- Actions ---
  const handleUndo = () => {
    if (historyStep > 0) {
      setHistoryStep(prev => prev - 1);
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(prev => prev + 1);
    }
  };

  const handleSelectTool = (tool: ToolType) => {
    if (tool === activeTool && (tool === 'pen' || tool === 'highlighter')) {
        setIsConfigMenuOpen(!isConfigMenuOpen);
    } else {
        setActiveTool(tool);
        setSelectedIds([]);
        setIsConfigMenuOpen(tool === 'pen' || tool === 'highlighter');
    }
  };

  const handleUploadImageTrigger = () => {
     const input = document.createElement('input');
     input.type = 'file';
     input.accept = 'image/*';
     input.onchange = (e) => handleUploadImage(e as any);
     input.click();
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          if (event.target?.result) {
              const rect = containerRef.current?.getBoundingClientRect();
              const centerX = rect ? (rect.width / 2 - viewTransform.x) / viewTransform.scale : 0;
              const centerY = rect ? (rect.height / 2 - viewTransform.y) / viewTransform.scale : 0;

              const newEl: BoardElement = {
                  id: uuidv4(),
                  type: 'image',
                  x: centerX - 150,
                  y: centerY - 150,
                  width: 300,
                  height: 300,
                  content: event.target.result as string,
                  zIndex: elements.length + 1
              };
              const newEls = [...elements, newEl];
              setElements(newEls);
              addToHistory(newEls);
              setActiveTool('select');
          }
      };
      reader.readAsDataURL(file);
  };

  const createTextElementAtCenter = (text: string) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const centerX = rect ? (rect.width / 2 - viewTransform.x) / viewTransform.scale : 0;
    const centerY = rect ? (rect.height / 2 - viewTransform.y) / viewTransform.scale : 0;
    
    const isShort = text.length < 50;
    
    const newEl: BoardElement = {
        id: uuidv4(),
        type: isShort ? 'sticky' : 'text',
        x: centerX - 100,
        y: centerY - 50,
        width: 200,
        height: isShort ? 200 : 100,
        content: text,
        color: isShort ? '#fef3c7' : '#1f2937',
        zIndex: elements.length + 1
    };
    return newEl;
  };

  const handlePaste = useCallback(async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            const newEl = createTextElementAtCenter(text);
            const newEls = [...elements, newEl];
            setElements(newEls);
            addToHistory(newEls);
        }
    } catch (err) {
        console.error("Failed to read clipboard:", err);
        alert("Unable to access clipboard directly. Please use Ctrl+V (or Cmd+V) to paste.");
    }
  }, [elements, viewTransform]);

  const handleSummarize = async () => {
    if (elements.length === 0) {
      alert("Canvas is empty! Add some notes first.");
      return;
    }
    setIsProcessingAI(true);
    try {
      const result = await summarizeBoard(elements);
      setSummary(result);
      setIsSummaryOpen(true);
    } catch (error) {
      console.error(error);
      alert("Failed to summarize board. Check console or API Key.");
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleAlign = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      if (selectedIds.length === 0) return;

      const selectedEls = elements.filter(el => selectedIds.includes(el.id));
      if (selectedEls.length === 0) return;

      let bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
      
      // If single selection, align to viewport center/edges? 
      // Current standard: align tools usually relative to selection. 
      // For single item, let's align to current VIEWPORT center for "Center/Middle".
      if (selectedEls.length === 1) {
          if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              const viewW = rect.width / viewTransform.scale;
              const viewH = rect.height / viewTransform.scale;
              // Viewport origin in world coordinates
              const viewX = -viewTransform.x / viewTransform.scale;
              const viewY = -viewTransform.y / viewTransform.scale;
              
              bounds = { 
                  minX: viewX, 
                  maxX: viewX + viewW, 
                  minY: viewY, 
                  maxY: viewY + viewH 
              };
          }
      } else {
           selectedEls.forEach(el => {
              bounds.minX = Math.min(bounds.minX, el.x);
              bounds.maxX = Math.max(bounds.maxX, el.x + (el.width || 0));
              bounds.minY = Math.min(bounds.minY, el.y);
              bounds.maxY = Math.max(bounds.maxY, el.y + (el.height || 0));
          });
      }

      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;

      const newElements = elements.map(el => {
          if (!selectedIds.includes(el.id)) return el;
          
          let newX = el.x;
          let newY = el.y;

          switch (type) {
              case 'left': newX = bounds.minX; break;
              case 'center': newX = centerX - (el.width || 0) / 2; break;
              case 'right': newX = bounds.maxX - (el.width || 0); break;
              case 'top': newY = bounds.minY; break;
              case 'middle': newY = centerY - (el.height || 0) / 2; break;
              case 'bottom': newY = bounds.maxY - (el.height || 0); break;
          }
          
          return { ...el, x: newX, y: newY };
      });

      setElements(newElements);
      addToHistory(newElements);
  };

  const handleContextMenuAction = (action: string, elementId: string | null) => {
    // If elementId is provided (from right click on item), it might be part of selection or not.
    // Logic: If elementId is in selectedIds, apply to all selectedIds.
    // If elementId is NOT in selectedIds, apply only to elementId (and technically should select it).

    let targetIds = selectedIds;
    if (elementId && !selectedIds.includes(elementId)) {
        targetIds = [elementId];
    }
    if (targetIds.length === 0 && elementId) targetIds = [elementId];

    // Alignment actions from Context Menu
    if (action.startsWith('align-')) {
        const alignType = action.replace('align-', '') as any;
        handleAlign(alignType);
        return;
    }

    let newElements = [...elements];
    
    if (action === 'delete') {
      newElements = newElements.filter(el => !targetIds.includes(el.id));
      setSelectedIds([]);
    } 
    else if (action === 'duplicate') {
      const duplicates: BoardElement[] = [];
      targetIds.forEach(id => {
          const el = newElements.find(e => e.id === id);
          if (el) {
              duplicates.push({ 
                  ...el, 
                  id: uuidv4(), 
                  x: el.x + 20, 
                  y: el.y + 20, 
                  zIndex: elements.length + duplicates.length + 1 
              });
          }
      });
      newElements.push(...duplicates);
      // Select the duplicates
      setSelectedIds(duplicates.map(d => d.id));
    }
    else if (action === 'front') {
      const maxZ = Math.max(...newElements.map(e => e.zIndex), 0);
      newElements = newElements.map(el => 
        targetIds.includes(el.id) ? { ...el, zIndex: maxZ + 1 } : el // Naive, but works. Better to stack them.
      );
      // Re-sort z-index to avoid gaps? Not strictly necessary for simple app
      newElements.sort((a, b) => a.zIndex - b.zIndex);
    }
    else if (action === 'back') {
       const minZ = Math.min(...newElements.map(e => e.zIndex), 0);
       newElements = newElements.map(el => 
         targetIds.includes(el.id) ? { ...el, zIndex: minZ - 1 } : el
       );
       newElements.sort((a, b) => a.zIndex - b.zIndex);
    }
    else if (action === 'paste') {
        handlePaste();
        return;
    }

    setElements(newElements);
    addToHistory(newElements);
  };

  // --- Normalization for Drawings ---
  const normalizeDrawing = (el: BoardElement): BoardElement => {
      if (!el.points || el.points.length === 0) return el;
      
      const xs = el.points.map(p => p.x);
      const ys = el.points.map(p => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);

      const padding = 5;
      const width = Math.max(20, maxX - minX + padding * 2);
      const height = Math.max(20, maxY - minY + padding * 2);

      const normalizedPoints = el.points.map(p => ({
          x: p.x - minX + padding,
          y: p.y - minY + padding
      }));

      return {
          ...el,
          x: minX - padding,
          y: minY - padding,
          width,
          height,
          points: normalizedPoints
      };
  };

  // --- Mouse & Key Events ---

  const handleWheel = (e: React.WheelEvent) => {
    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.1, viewTransform.scale * (1 + scaleAmount)), 5);
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - viewTransform.x) / viewTransform.scale;
      const worldY = (mouseY - viewTransform.y) / viewTransform.scale;

      const newX = mouseX - worldX * newScale;
      const newY = mouseY - worldY * newScale;

      setViewTransform({ x: newX, y: newY, scale: newScale });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
        if (isDrawingMode) {
             e.preventDefault();
             e.stopPropagation();
        }
        return;
    }

    if (contextMenu.isOpen) {
        setContextMenu(prev => ({ ...prev, isOpen: false }));
    }

    if (resizeInfo.isResizing || rotateInfo.isRotating) return;

    const isBackground = e.target === containerRef.current || (e.target as HTMLElement).id === 'main-svg-layer';
    const pos = getMousePos(e);

    // Pan
    if (activeTool === 'select' && isBackground) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setSelectedIds([]);
      return;
    }

    // Free drawing
    if (isDrawingMode) {
      setIsDrawing(true);
      const config = activeTool === 'pen' ? penConfig : markerConfig;
      
      const newPathId = uuidv4();
      const newElement: BoardElement = {
        id: newPathId,
        type: activeTool,
        x: 0, 
        y: 0,
        points: [pos],
        color: config.color,
        strokeWidth: config.width,
        zIndex: activeTool === 'highlighter' ? 0 : elements.length + 1,
        width: pos.x + config.width * 2,
        height: pos.y + config.width * 2,
        rotation: 0
      };

      setElements(prev => [...prev, newElement]);
      return;
    }

    // Drag-to-Create Shape/Text
    if (activeTool !== 'select') {
      const isSticky = activeTool === 'sticky';
      const isText = activeTool === 'text';
      
      const newId = uuidv4();
      const newElement: BoardElement = {
        id: newId,
        type: activeTool as any,
        x: pos.x,
        y: pos.y,
        zIndex: elements.length + 1,
        width: 0, // Start with 0 width/height
        height: 0,
        content: (isSticky || isText) ? 'Double click to edit' : undefined,
        
        color: isSticky ? '#fef3c7' : (isText ? '#1f2937' : 'transparent'),
        fillColor: isSticky ? '#fef3c7' : (isText ? undefined : 'transparent'),
        strokeColor: (isSticky || isText) ? undefined : '#000000',
        strokeWidth: 3,
        fontSize: isText ? 24 : 18,
        rotation: 0
      };
      
      setElements(prev => [...prev, newElement]);
      setSelectedIds([newId]);
      setCreationStart(pos); // Mark that we are creating this element
      return;
    }
    
    if (isBackground) {
        setSelectedIds([]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getMousePos(e);

    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setViewTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Handling Rotation (Only if 1 item selected)
    if (rotateInfo.isRotating && selectedIds.length === 1) {
        const dx = pos.x - rotateInfo.centerX;
        const dy = pos.y - rotateInfo.centerY;
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        angle += 90; 

        if (e.shiftKey) {
            angle = Math.round(angle / 15) * 15;
        }

        setElements(prev => prev.map(el => el.id === selectedIds[0] ? { ...el, rotation: angle } : el));
        return;
    }

    if (resizeInfo.isResizing && selectedIds.length === 1) {
        const dx = pos.x - resizeInfo.startX;
        const dy = pos.y - resizeInfo.startY;

        setElements(prev => prev.map(el => {
            if (el.id !== selectedIds[0]) return el;

            let { x, y, width, height } = {
                x: resizeInfo.initialX,
                y: resizeInfo.initialY,
                width: resizeInfo.initialWidth,
                height: resizeInfo.initialHeight
            };

            const h = resizeInfo.handle;
            
            if (h?.includes('e')) width += dx;
            if (h?.includes('w')) { width -= dx; x += dx; }
            if (h?.includes('s')) height += dy;
            if (h?.includes('n')) { height -= dy; y += dy; }

            if (width < 20) {
                if (h?.includes('w')) x = resizeInfo.initialX + resizeInfo.initialWidth - 20;
                width = 20;
            }
            if (height < 20) {
                if (h?.includes('n')) y = resizeInfo.initialY + resizeInfo.initialHeight - 20;
                height = 20;
            }

            return { ...el, x, y, width, height };
        }));
        return;
    }

    // Handling Drag-to-Create
    if (creationStart && selectedIds.length === 1) {
        const start = creationStart;
        const current = pos;

        setElements(prev => prev.map(el => {
            if (el.id !== selectedIds[0]) return el;

            // Logic for Line and Arrow
            if (el.type === 'line' || el.type === 'arrow') {
                const dx = current.x - start.x;
                const dy = current.y - start.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                const midX = (start.x + current.x) / 2;
                const midY = (start.y + current.y) / 2;
                const height = 20;
                
                return {
                    ...el,
                    width: Math.max(20, length),
                    height: height,
                    x: midX - Math.max(20, length) / 2,
                    y: midY - height / 2,
                    rotation: angle
                };
            }
            
            // Logic for shapes
            const minX = Math.min(start.x, current.x);
            const minY = Math.min(start.y, current.y);
            let w = Math.abs(current.x - start.x);
            let h = Math.abs(current.y - start.y);

            if (e.shiftKey) {
                const maxDim = Math.max(w, h);
                w = maxDim;
                h = maxDim;
            }

            return { ...el, x: minX, y: minY, width: w, height: h };
        }));
        return;
    }

    if (isDrawing) {
      setElements(prev => {
        const lastEl = prev[prev.length - 1];
        if (!lastEl.points) return prev;
        
        const newPoints = [...lastEl.points, pos];
        const padding = (lastEl.strokeWidth || 5) * 2;
        const newWidth = Math.max(lastEl.width || 0, pos.x + padding);
        const newHeight = Math.max(lastEl.height || 0, pos.y + padding);

        return prev.map(el => 
          el.id === lastEl.id 
            ? { ...el, points: newPoints, width: newWidth, height: newHeight }
            : el
        );
      });
      return;
    }

    if (dragInfo.isDragging && dragInfo.initialPositions.length > 0) {
      const dx = pos.x - dragInfo.startX;
      const dy = pos.y - dragInfo.startY;

      setElements(prev => prev.map(el => {
          const initialPos = dragInfo.initialPositions.find(p => p.id === el.id);
          if (initialPos) {
              return { ...el, x: initialPos.x + dx, y: initialPos.y + dy };
          }
          return el;
      }));
    }
  };

  const handleMouseUp = () => {
    if (isDrawing) {
        setElements(prev => {
            const lastEl = prev[prev.length - 1];
            if (!lastEl.points) return prev;
            const normalized = normalizeDrawing(lastEl);
            const newEls = prev.map(el => el.id === lastEl.id ? normalized : el);
            addToHistory(newEls);
            return newEls;
        });
    } else if (creationStart && selectedIds.length === 1) {
        setElements(prev => {
            const el = prev.find(e => e.id === selectedIds[0]);
            if (el && el.width && el.width < 5 && el.height && el.height < 5) {
                const filtered = prev.filter(e => e.id !== selectedIds[0]);
                setSelectedIds([]);
                return filtered;
            }
            addToHistory(prev);
            return prev;
        });
    } else if (dragInfo.isDragging || resizeInfo.isResizing || rotateInfo.isRotating) {
        addToHistory(elements);
    }

    setIsDrawing(false);
    setIsPanning(false);
    setCreationStart(null);
    setDragInfo(prev => ({ ...prev, isDragging: false, initialPositions: [] }));
    setResizeInfo(prev => ({ ...prev, isResizing: false }));
    setRotateInfo(prev => ({ ...prev, isRotating: false }));
  };

  const handleContextMenu = (e: React.MouseEvent, elementId: string | null = null) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDrawingMode) return;

    // If right clicking an item that isn't selected, select it (exclusive)
    if (elementId && !selectedIds.includes(elementId)) {
        setSelectedIds([elementId]);
    }

    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      selectedIds: elementId && !selectedIds.includes(elementId) ? [elementId] : selectedIds
    });
  };

  const handleElementSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    if (e.button === 2) {
      if (!isDrawingMode) {
        handleContextMenu(e, id);
      }
      return;
    }

    if (isDrawingMode) return;

    if (activeTool === 'select') {
      let newSelectedIds = [...selectedIds];
      if (e.shiftKey) {
          if (newSelectedIds.includes(id)) {
              newSelectedIds = newSelectedIds.filter(selectedId => selectedId !== id);
          } else {
              newSelectedIds.push(id);
          }
      } else {
          // If clicking on an item already in the group, don't deselect others immediately (might be start of drag)
          if (!newSelectedIds.includes(id)) {
              newSelectedIds = [id];
          }
      }
      
      setSelectedIds(newSelectedIds);
      setIsConfigMenuOpen(true);
      
      const pos = getMousePos(e);
      // Capture initial positions for potentially multiple elements
      const relevantElements = elements.filter(el => newSelectedIds.includes(el.id));
      
      setDragInfo({
        isDragging: true,
        startX: pos.x,
        startY: pos.y,
        initialPositions: relevantElements.map(el => ({ id: el.id, x: el.x, y: el.y }))
      });
    }
  };

  const handleResizeStart = (e: React.MouseEvent, direction: ResizeHandleDirection) => {
      if (selectedIds.length !== 1) return;
      const pos = getMousePos(e);
      const element = elements.find(el => el.id === selectedIds[0]);
      if (element && element.width && element.height) {
          setResizeInfo({
              isResizing: true,
              handle: direction,
              startX: pos.x,
              startY: pos.y,
              initialX: element.x,
              initialY: element.y,
              initialWidth: element.width,
              initialHeight: element.height
          });
      }
  };

  const handleRotateStart = (e: React.MouseEvent) => {
      if (selectedIds.length !== 1) return;
      const pos = getMousePos(e);
      const element = elements.find(el => el.id === selectedIds[0]);
      if (element && element.width && element.height) {
          const centerX = element.x + element.width / 2;
          const centerY = element.y + element.height / 2;
          setRotateInfo({
              isRotating: true,
              startX: pos.x,
              startY: pos.y,
              initialRotation: element.rotation || 0,
              centerX,
              centerY
          });
      }
  };

  const handleContentChange = (id: string, newContent: string) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, content: newContent } : el));
  };
  
  const handleConfigChange = (tool: 'pen' | 'highlighter', config: { color: string; width: number }) => {
      if (tool === 'pen') setPenConfig(config);
      else setMarkerConfig(config);
  };

  const handleElementUpdate = (id: string | null, updates: Partial<BoardElement>) => {
      if (!id) return;
      const newEls = elements.map(el => el.id === id ? { ...el, ...updates } : el);
      setElements(newEls);
      addToHistory(newEls);
  };

  const handleColorChange = (color: string) => {
      // Apply to all selected
      const newEls = elements.map(el => {
          if (selectedIds.includes(el.id)) {
              if (el.type === 'text') return { ...el, color };
              return { ...el, color, fillColor: color };
          }
          return el;
      });
      setElements(newEls);
      addToHistory(newEls);
  };

  // Paste Listener
  useEffect(() => {
    const pasteListener = (e: ClipboardEvent) => {
        if (isCommandPaletteOpen) return;
        const text = e.clipboardData?.getData('text');
        if (text) {
             const newEl = createTextElementAtCenter(text);
            setElements(prev => {
                const newEls = [...prev, newEl];
                return newEls;
            });
        }
    };
    window.addEventListener('paste', pasteListener);
    return () => window.removeEventListener('paste', pasteListener);
  }, [viewTransform, isCommandPaletteOpen]);

  // Global Key Down Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.getAttribute('contenteditable') === 'true';

      // Toggle Command Palette (Ctrl+K)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          setIsCommandPaletteOpen(prev => !prev);
          return;
      }
      
      if (isCommandPaletteOpen) return;
      
      // Shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (((e.ctrlKey || e.metaKey) && e.key === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (isInputActive) return;

      switch(e.key.toLowerCase()) {
          case 'v': handleSelectTool('select'); break;
          case 'p': handleSelectTool('pen'); break;
          case 'h': handleSelectTool('highlighter'); break;
          case 't': handleSelectTool('text'); break;
          case 's': handleSelectTool('sticky'); break;
          case 'r': handleSelectTool('rect'); break;
          case 'c': handleSelectTool('circle'); break;
          case 'l': handleSelectTool('line'); break;
          case 'a': handleSelectTool('arrow'); break;
          case 'backspace':
          case 'delete':
              if (selectedIds.length > 0) {
                setElements(prev => {
                    const newEls = prev.filter(el => !selectedIds.includes(el.id));
                    addToHistory(newEls);
                    return newEls;
                });
                setSelectedIds([]);
                setIsConfigMenuOpen(false);
              }
              break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, history, historyStep, isCommandPaletteOpen]);

  // --- Command Palette Data ---
  const commands: CommandOption[] = [
    // Tools
    { id: 'tool-select', label: 'Select Tool', icon: <MousePointer2 size={18} />, shortcut: 'V', section: 'Tools', action: () => handleSelectTool('select') },
    { id: 'tool-pen', label: 'Pen', icon: <Pencil size={18} />, shortcut: 'P', section: 'Tools', action: () => handleSelectTool('pen') },
    { id: 'tool-marker', label: 'Highlighter', icon: <Highlighter size={18} />, shortcut: 'H', section: 'Tools', action: () => handleSelectTool('highlighter') },
    { id: 'tool-text', label: 'Text', icon: <Type size={18} />, shortcut: 'T', section: 'Tools', action: () => handleSelectTool('text') },
    { id: 'tool-sticky', label: 'Sticky Note', icon: <StickyNote size={18} />, shortcut: 'S', section: 'Tools', action: () => handleSelectTool('sticky') },
    { id: 'tool-rect', label: 'Rectangle', icon: <Shapes size={18} />, shortcut: 'R', section: 'Tools', action: () => handleSelectTool('rect') },
    { id: 'tool-circle', label: 'Circle', icon: <Shapes size={18} />, shortcut: 'C', section: 'Tools', action: () => handleSelectTool('circle') },
    { id: 'tool-line', label: 'Line', icon: <Shapes size={18} />, shortcut: 'L', section: 'Tools', action: () => handleSelectTool('line') },
    { id: 'tool-arrow', label: 'Arrow', icon: <Shapes size={18} />, shortcut: 'A', section: 'Tools', action: () => handleSelectTool('arrow') },
    { id: 'action-image', label: 'Upload Image', icon: <ImageIcon size={18} />, section: 'Tools', action: handleUploadImageTrigger },
    
    // Actions
    { id: 'ai-summary', label: 'Generate AI Summary', icon: <Sparkles size={18} />, section: 'Actions', action: handleSummarize },
    { id: 'action-undo', label: 'Undo', icon: <Undo2 size={18} />, shortcut: 'Ctrl+Z', section: 'Actions', action: handleUndo },
    { id: 'action-redo', label: 'Redo', icon: <Redo2 size={18} />, shortcut: 'Ctrl+Y', section: 'Actions', action: handleRedo },
    { id: 'action-dup', label: 'Duplicate Selected', icon: <Copy size={18} />, shortcut: 'Ctrl+D', section: 'Actions', action: () => selectedIds.length && handleContextMenuAction('duplicate', selectedIds[0]) }, // Naive trigger, context menu action handles list
    { id: 'action-del', label: 'Delete Selected', icon: <Trash2 size={18} />, shortcut: 'Del', section: 'Actions', action: () => selectedIds.length && handleContextMenuAction('delete', null) },
    { id: 'action-front', label: 'Bring to Front', icon: <ArrowUp size={18} />, shortcut: ']', section: 'Actions', action: () => selectedIds.length && handleContextMenuAction('front', null) },
    { id: 'action-back', label: 'Send to Back', icon: <ArrowDown size={18} />, shortcut: '[', section: 'Actions', action: () => selectedIds.length && handleContextMenuAction('back', null) },

    // View / System
    { id: 'sys-zoom', label: 'Zoom to Fit', icon: <Maximize size={18} />, shortcut: 'Shift+1', section: 'View', action: handleZoomToFit },
    { id: 'sys-grid', label: 'Toggle Grid', icon: <Grid3X3 size={18} />, shortcut: "'", section: 'View', action: handleToggleGrid },
    { id: 'sys-export', label: 'Export as PNG', icon: <Download size={18} />, shortcut: 'Ctrl+E', section: 'System', action: handleExportPNG },
    { id: 'sys-clear', label: 'Clear Canvas', icon: <XCircle size={18} />, shortcut: 'Ctrl+Bksp', section: 'System', action: handleClearCanvas },
  ];

  return (
    <div className="w-full h-screen bg-[#f3f4f6] overflow-hidden font-sans select-none flex flex-col relative">
      
      {/* Grid Background */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-40 transition-opacity duration-300" 
        style={{
          opacity: showGrid ? 0.4 : 0,
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
          backgroundSize: `${24 * viewTransform.scale}px ${24 * viewTransform.scale}px`,
          backgroundPosition: `${viewTransform.x}px ${viewTransform.y}px`
        }}
      />

      <div 
        ref={containerRef}
        className="w-full h-full relative z-10 overflow-hidden touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => handleContextMenu(e, null)}
        style={{ cursor: activeTool === 'select' ? (isPanning ? 'grabbing' : 'default') : 'crosshair' }}
      >
        <div 
            id="main-svg-layer"
            className="absolute origin-top-left will-change-transform"
            style={{
                transform: `translate(${viewTransform.x}px, ${viewTransform.y}px) scale(${viewTransform.scale})`
            }}
        >
            {elements.map(el => (
            <BoardItem
                key={el.id}
                element={el}
                isSelected={selectedIds.includes(el.id)}
                shouldShowHandles={selectedIds.length === 1}
                isDrawingMode={isDrawingMode}
                onSelect={(e) => handleElementSelect(e, el.id)}
                onChange={handleContentChange}
                onResizeStart={handleResizeStart}
                onRotateStart={handleRotateStart}
            />
            ))}
        </div>
      </div>

      <Toolbar 
        activeTool={activeTool} 
        selectedElements={elements.filter(el => selectedIds.includes(el.id))}
        onSelectTool={handleSelectTool} 
        onSummarize={handleSummarize}
        onUploadImage={handleUploadImage}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyStep > 0}
        canRedo={historyStep < history.length - 1}
        isProcessing={isProcessingAI}
        penConfig={penConfig}
        markerConfig={markerConfig}
        isConfigOpen={isConfigMenuOpen}
        onConfigChange={handleConfigChange}
        onColorChange={handleColorChange}
        onElementUpdate={handleElementUpdate}
        onAlign={handleAlign}
      />

      <SummaryModal 
        isOpen={isSummaryOpen} 
        onClose={() => setIsSummaryOpen(false)} 
        summary={summary} 
      />
      
      <ContextMenu 
        {...contextMenu}
        onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
        onAction={handleContextMenuAction}
      />

      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commands}
      />

      {!process.env.API_KEY && (
         <div className="absolute top-20 right-4 bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-lg z-50 max-w-sm pointer-events-auto">
            <p className="font-bold">Missing API Key</p>
            <p className="text-sm">Please provide a valid GEMINI API Key in the environment to use AI features.</p>
         </div>
      )}
    </div>
  );
};

export default App;
