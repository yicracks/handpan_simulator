import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';

interface SequencerProps {
  fullSequence: (number | null)[][];
  currentStep: number;
  focusedCell: { hand: 0 | 1, globalStep: number } | null;
  onFocusCell: (cell: { hand: 0 | 1, globalStep: number } | null) => void;
  appMode?: 'practice' | 'composition';
  pageIndex: number;
  maxNotes: number;
  onUpdate: (hand: 0 | 1, step: number, value: number | null) => void;
  onPlayNote: (index: number) => void;
}

export const Sequencer: React.FC<SequencerProps> = ({ 
  fullSequence, 
  currentStep, 
  focusedCell,
  onFocusCell,
  appMode, 
  pageIndex, 
  maxNotes, 
  onUpdate, 
  onPlayNote 
}) => {
  const [dragInfo, setDragInfo] = useState<{
    start: number;
    current: number;
    value: number | null;
    hand: 0 | 1;
  } | null>(null);
  const cellRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (focusedCell) {
      const localStep = focusedCell.globalStep % STEPS_PER_PAGE;
      const key = `${focusedCell.hand}-${localStep}`;
      cellRefs.current[key]?.focus();
    }
  }, [focusedCell]);

  const STEPS_PER_PAGE = 16;
  const startIdx = pageIndex * STEPS_PER_PAGE;
  const endIdx = startIdx + STEPS_PER_PAGE;

  const handleCellMouseDown = (hand: 0 | 1, localStep: number) => {
    const globalStep = startIdx + localStep;
    const currentValue = fullSequence[hand][globalStep];
    
    onFocusCell({ hand, globalStep });
    
    setDragInfo({
      start: localStep,
      current: localStep,
      value: currentValue,
      hand: hand
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, hand: 0 | 1, localStep: number) => {
    const globalStep = startIdx + localStep;
    const currentValue = fullSequence[hand][globalStep];

    if (e.key >= '0' && e.key <= '9') {
      const digit = parseInt(e.key, 10);
      let newValue: number;

      if (currentValue !== null && currentValue !== 0) {
        const appended = currentValue * 10 + digit;
        if (appended < maxNotes) {
          newValue = appended;
        } else {
          newValue = digit;
        }
      } else {
        newValue = digit;
      }

      onUpdate(hand, globalStep, newValue);
      onPlayNote(newValue);
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === ' ') {
      onUpdate(hand, globalStep, null);
    } else if (e.key === 'ArrowRight') {
      const fullSteps = fullSequence[0].length;
      onFocusCell({ hand, globalStep: Math.min(fullSteps - 1, globalStep + 1) });
    } else if (e.key === 'ArrowLeft') {
      onFocusCell({ hand, globalStep: Math.max(0, globalStep - 1) });
    } else if (e.key === 'Enter') {
      const fullSteps = fullSequence[0].length;
      onFocusCell({ hand, globalStep: Math.min(fullSteps - 1, globalStep + 1) });
    }
  };

  const handleMouseEnter = (localStep: number) => {
    if (dragInfo) {
      setDragInfo({ ...dragInfo, current: localStep });
    }
  };

  const handleMouseUp = () => {
    if (dragInfo) {
      const minLocal = Math.min(dragInfo.start, dragInfo.current);
      const maxLocal = Math.max(dragInfo.start, dragInfo.current);
      for (let i = minLocal; i <= maxLocal; i++) {
        onUpdate(dragInfo.hand, startIdx + i, dragInfo.value);
      }
      setDragInfo(null);
    }
  };

  return (
    <div 
      className="w-full bg-slate-900/40 p-6 rounded-3xl border border-white/5 space-y-4 select-none backdrop-blur-sm"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {[1, 0].map((hand) => (
        <div key={hand} className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="w-10 flex flex-col items-center justify-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${hand === 1 ? 'bg-blue-400' : 'bg-slate-600'}`} />
              <span className="text-[8px] uppercase tracking-tighter text-slate-500 font-bold">
                {hand === 1 ? 'R' : 'L'}
              </span>
            </div>
            <div className="flex-1 grid grid-cols-16 gap-1.5 h-12">
              {fullSequence[hand].slice(startIdx, endIdx).map((value, localStep) => {
                const globalStep = startIdx + localStep;
                const isBeingDragged = dragInfo && 
                  dragInfo.hand === hand && 
                  localStep >= Math.min(dragInfo.start, dragInfo.current) && 
                  localStep <= Math.max(dragInfo.start, dragInfo.current);
                
                const displayValue = isBeingDragged ? dragInfo.value : value;
                const hasValue = displayValue !== null;
                const isActive = currentStep === globalStep;
                const isFocused = focusedCell?.hand === hand && focusedCell?.globalStep === globalStep;

                return (
                  <motion.div
                    key={localStep}
                    ref={el => cellRefs.current[`${hand}-${localStep}`] = el}
                    tabIndex={0}
                    onMouseDown={() => handleCellMouseDown(hand as 0 | 1, localStep)}
                    onMouseEnter={() => handleMouseEnter(localStep)}
                    onKeyDown={(e) => handleKeyDown(e, hand as 0 | 1, localStep)}
                    className={`relative rounded-lg cursor-pointer flex items-center justify-center transition-all border outline-none
                      ${isActive ? 'ring-2 ring-blue-500/50' : ''}
                      ${isFocused ? 'ring-2 ring-white/60 bg-white/10' : ''}
                      ${hasValue ? 'bg-blue-600/30 border-blue-500/50' : 'bg-slate-950/40 border-white/5 hover:bg-slate-800'}
                      ${isBeingDragged ? 'opacity-80 scale-95 ring-1 ring-blue-400' : ''}`}
                    whileTap={{ scale: 0.9 }}
                  >
                    {hasValue && (
                      <span className="text-sm font-mono font-bold text-blue-100">{displayValue}</span>
                    )}
                    {isActive && (
                      <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
      <div className="flex justify-between items-center pl-14">
         <div className="grid grid-cols-16 flex-1 gap-1.5 min-h-[1.5rem]">
            {Array.from({length: 16}).map((_, i) => {
               const globalStep = startIdx + i;
               return (
                 <div 
                   key={i} 
                   className="flex items-center justify-center text-[8px] font-mono text-slate-700 py-0.5"
                 >
                    {globalStep + 1}
                 </div>
               );
            })}
         </div>
      </div>
      <p className="text-[10px] text-slate-500 italic text-center opacity-50">
        Drag to fill • Page {pageIndex + 1} • Notes 0-{maxNotes - 1}
      </p>
    </div>
  );
};
