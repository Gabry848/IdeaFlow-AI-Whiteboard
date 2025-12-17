
import React, { useEffect, useRef } from 'react';
import { Trash2, Copy, ArrowUp, ArrowDown, ClipboardPaste, AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  selectedIds: string[];
  onClose: () => void;
  onAction: (action: string, elementId: string | null) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, isOpen, selectedIds, onClose, onAction }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      const timeoutId = setTimeout(() => {
          document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAction = (action: string) => {
    // If multiple items selected, elementId might be null or the one clicked, but logic is handled by parent
    onAction(action, selectedIds.length > 0 ? selectedIds[0] : null);
    onClose();
  };

  const hasSelection = selectedIds.length > 0;
  const isMultiSelect = selectedIds.length > 1;

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-white/90 backdrop-blur-md border border-gray-200 shadow-xl rounded-xl py-1 w-56 animate-in fade-in zoom-in-95 duration-100 origin-top-left"
      style={{ top: y, left: x }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {hasSelection ? (
        <>
           {/* Alignment Options - Only for multiple items usually, but we allow for 1 (align to canvas/view) */}
           <div className="px-2 py-2 mb-1 border-b border-gray-100 grid grid-cols-6 gap-1">
                <button onClick={() => handleAction('align-left')} className="p-1 hover:bg-gray-100 rounded flex justify-center text-gray-700" title="Align Left"><AlignLeft size={16} /></button>
                <button onClick={() => handleAction('align-center')} className="p-1 hover:bg-gray-100 rounded flex justify-center text-gray-700" title="Align Center"><AlignCenter size={16} /></button>
                <button onClick={() => handleAction('align-right')} className="p-1 hover:bg-gray-100 rounded flex justify-center text-gray-700" title="Align Right"><AlignRight size={16} /></button>
                <button onClick={() => handleAction('align-top')} className="p-1 hover:bg-gray-100 rounded flex justify-center text-gray-700" title="Align Top"><AlignStartVertical size={16} /></button>
                <button onClick={() => handleAction('align-middle')} className="p-1 hover:bg-gray-100 rounded flex justify-center text-gray-700" title="Align Middle"><AlignCenterVertical size={16} /></button>
                <button onClick={() => handleAction('align-bottom')} className="p-1 hover:bg-gray-100 rounded flex justify-center text-gray-700" title="Align Bottom"><AlignEndVertical size={16} /></button>
           </div>

          <button
            onClick={() => handleAction('duplicate')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
          >
            <Copy size={14} /> Duplicate
          </button>
          <button
            onClick={() => handleAction('front')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
          >
            <ArrowUp size={14} /> Bring to Front
          </button>
          <button
            onClick={() => handleAction('back')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
          >
            <ArrowDown size={14} /> Send to Back
          </button>
          <div className="h-px bg-gray-200 my-1" />
          <button
            onClick={() => handleAction('delete')}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 size={14} /> Delete
          </button>
        </>
      ) : (
        <button
          onClick={() => handleAction('paste')}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
        >
          <ClipboardPaste size={14} /> Paste
        </button>
      )}
    </div>
  );
};

export default ContextMenu;
