
export type ToolType = 
  | 'select' 
  | 'pen' 
  | 'highlighter' 
  | 'text' 
  | 'sticky' 
  | 'rect' 
  | 'circle' 
  | 'triangle' 
  | 'rhombus' 
  | 'arrow' 
  | 'line' 
  | 'cylinder';

export interface Point {
  x: number;
  y: number;
}

export interface BoardElement {
  id: string;
  type: ToolType | 'image';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string; // For text, sticky, or image URL
  
  // Appearance
  color?: string; // Legacy/General color (often used for background or sticky color)
  fillColor?: string; // Specific fill color (can be 'transparent')
  strokeColor?: string; // Specific border/line color
  textColor?: string; // Specific text color
  fontSize?: number; // Font size
  
  points?: Point[]; // For drawing paths
  strokeWidth?: number;
  rotation?: number;
  zIndex: number;
}

export interface DragInfo {
  isDragging: boolean;
  startX: number;
  startY: number;
  // Store initial positions for all dragged elements
  initialPositions: { id: string; x: number; y: number }[];
}

export type ResizeHandleDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface ResizeInfo {
  isResizing: boolean;
  handle: ResizeHandleDirection | null;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  initialWidth: number;
  initialHeight: number;
}

export interface RotateInfo {
    isRotating: boolean;
    startX: number;
    startY: number;
    initialRotation: number;
    centerX: number;
    centerY: number;
}

export interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  selectedIds: string[];
}

export interface AIResponse {
  summary: string;
  actionItems: string[];
}
