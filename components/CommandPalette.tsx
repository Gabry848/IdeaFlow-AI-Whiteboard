
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  MousePointer2, 
  Pencil, 
  Highlighter, 
  Type, 
  StickyNote, 
  Shapes, 
  Sparkles, 
  Download, 
  Maximize, 
  Trash2, 
  Grid3X3, 
  Copy, 
  Undo2, 
  Redo2, 
  ArrowUp, 
  ArrowDown, 
  XCircle,
  Image as ImageIcon
} from 'lucide-react';

export interface CommandOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  section: 'Tools' | 'Actions' | 'View' | 'System';
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandOption[];
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Focus input after a small delay to allow render
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter commands
  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  // Group commands for rendering
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.section]) acc[cmd.section] = [];
    acc[cmd.section].push(cmd);
    return acc;
  }, {} as Record<string, CommandOption[]>);

  // Keyboard navigation within the palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
        const activeItem = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest' });
        }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in duration-300 fill-mode-forwards" 
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/50 overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 ease-out">
        
        {/* Style for light scrollbar */}
        <style dangerouslySetInnerHTML={{__html: `
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: #e5e7eb;
            border-radius: 20px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: #d1d5db;
          }
        `}} />

        {/* Search Input */}
        <div className="flex items-center px-4 py-4 border-b border-gray-200/50">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-xl text-gray-800 placeholder-gray-400 focus:outline-none"
            placeholder="Type a command..."
            value={query}
            onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
            }}
          />
          <div className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-1 rounded border border-gray-200">ESC</div>
        </div>

        {/* Command List */}
        <div 
            ref={listRef}
            className="max-h-[60vh] overflow-y-auto py-2 custom-scrollbar"
        >
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-400">
              No matching commands found.
            </div>
          ) : (
            Object.keys(groupedCommands).map((section) => (
              <div key={section} className="mb-2">
                <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {section}
                </div>
                {groupedCommands[section].map((cmd) => {
                    const globalIndex = filteredCommands.indexOf(cmd);
                    const isActive = globalIndex === selectedIndex;

                    return (
                        <button
                            key={cmd.id}
                            data-index={globalIndex}
                            onClick={() => {
                                cmd.action();
                                onClose();
                            }}
                            className={`
                                w-full px-4 py-3 flex items-center justify-between transition-colors cursor-pointer
                                ${isActive ? 'bg-blue-500/10 border-l-4 border-blue-500 pl-3' : 'border-l-4 border-transparent pl-3 hover:bg-gray-50'}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                                    {cmd.icon}
                                </div>
                                <span className={`font-medium ${isActive ? 'text-blue-900' : 'text-gray-700'}`}>{cmd.label}</span>
                            </div>
                            {cmd.shortcut && (
                                <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${isActive ? 'bg-white text-blue-600 shadow-sm' : 'bg-gray-100 text-gray-500'}`}>
                                    {cmd.shortcut}
                                </span>
                            )}
                        </button>
                    );
                })}
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <div className="flex gap-4">
                <span><strong className="font-medium text-gray-500">↑↓</strong> Navigate</span>
                <span><strong className="font-medium text-gray-500">Enter</strong> Select</span>
            </div>
            <span>IdeaFlow AI</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
