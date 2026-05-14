import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Settings2, Trash2, Github, Waves, ChevronLeft, ChevronRight, Save, Upload, PenTool, Brain, RotateCw, RefreshCw } from 'lucide-react';
import { Handpan } from './components/Handpan';
import { Sequencer } from './components/Sequencer';
import { useHandpanSynth, HANDPAN_MODELS, HandpanModelKey } from './hooks/useHandpanSynth';
import * as Tone from 'tone';

const STEPS_PER_PAGE = 16;
const TOTAL_PAGES = 100;
const FULL_STEPS = STEPS_PER_PAGE * TOTAL_PAGES;

type AppMode = 'practice' | 'composition';
type Language = 'en' | 'zh';

const TRANSLATIONS = {
  en: {
    practice: 'Practice',
    composition: 'Compose',
    tempo: 'Tempo',
    page: 'Page',
    save: 'Save',
    load: 'Load',
    clear: 'Clear Music',
    start: 'Start',
    stop: 'Stop',
    play: 'Play',
    clearConfirm: 'Clear entire composition?',
    successLoad: 'Composition loaded!',
    invalidFile: 'Invalid file format.',
    settings: 'Settings',
    language: 'Language',
    rotation: 'Handpan Rotation',
    visibility: 'UI Visibility',
    showMode: 'Show Modes',
    showModels: 'Show Model Switcher',
    showTempo: 'Show Tempo Control',
    showRotation: 'Show Rotation Control',
    contact: 'Contact',
    version: 'Version',
    reset: 'Reset',
    close: 'Close',
    recordingHand: 'Recording',
    leftHand: 'Left Hand',
    rightHand: 'Right Hand',
    step: 'Step'
  },
  zh: {
    practice: '练习模式',
    composition: '编曲模式',
    tempo: '节拍',
    page: '页码',
    save: '保存',
    load: '加载',
    clear: '清空乐谱',
    start: '开始',
    stop: '停止',
    play: '播放',
    clearConfirm: '确定要清空整份乐谱吗？',
    successLoad: '曲谱加载成功',
    invalidFile: '文件格式不正确',
    settings: '设置',
    language: '语言',
    rotation: '手碟旋转角度',
    visibility: '界面显示',
    showMode: '显示模式切换',
    showModels: '显示手碟选择',
    showTempo: '显示节拍调节',
    showRotation: '显示旋转图标',
    contact: '联系方式',
    version: '版本号',
    reset: '重置',
    close: '关闭',
    recordingHand: '录制中',
    leftHand: '左手',
    rightHand: '右手',
    step: '步'
  }
};

export default function App() {
  const [activeModel, setActiveModel] = useState<HandpanModelKey>('celtic');
  const { playNote } = useHandpanSynth(activeModel);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [tempo, setTempo] = useState(120);
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  const [appMode, setAppMode] = useState<AppMode>('practice');
  const [currentPage, setCurrentPage] = useState(0);
  const [focusedCell, setFocusedCell] = useState<{ hand: 0 | 1, globalStep: number } | null>(null);
  
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('zenpan_lang');
    return (saved as Language) || (navigator.language.startsWith('zh') ? 'zh' : 'en');
  });
  const [showSettings, setShowSettings] = useState(false);
  const [uiVisibility, setUiVisibility] = useState(() => {
    const saved = localStorage.getItem('zenpan_ui_visibility');
    return saved ? JSON.parse(saved) : {
      mode: true,
      models: true,
      tempo: true,
      rotation: true
    };
  });
  
  const t = TRANSLATIONS[language];

  useEffect(() => {
    localStorage.setItem('zenpan_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('zenpan_ui_visibility', JSON.stringify(uiVisibility));
  }, [uiVisibility]);

  useEffect(() => {
    let animationFrame: number;
    const rotate = () => {
      if (isRotating) {
        setRotationAngle(prev => (prev + 1) % 360);
      }
      animationFrame = requestAnimationFrame(rotate);
    };
    animationFrame = requestAnimationFrame(rotate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isRotating]);

  const [sequence, setSequence] = useState<(number | null)[][]>([
    Array(FULL_STEPS).fill(null),
    Array(FULL_STEPS).fill(null)
  ]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleUpdateSequence = (hand: 0 | 1, step: number, value: number | null) => {
    setSequence(prev => {
      const next = [...prev];
      next[hand] = [...next[hand]];
      next[hand][step] = value;
      return next;
    });
  };

  const handleNotePlay = useCallback((index: number) => {
    Tone.start();
    setActiveNotes(prev => [...prev, index]);
    playNote(index);
    
    // Recording logic for composition mode
    if (appMode === 'composition' && focusedCell) {
      handleUpdateSequence(focusedCell.hand, focusedCell.globalStep, index);
      
      const nextGlobalStep = (focusedCell.globalStep + 1) % FULL_STEPS;
      setFocusedCell({ ...focusedCell, globalStep: nextGlobalStep });
      
      // Auto-switch page if cursor moves out of view
      const nextPage = Math.floor(nextGlobalStep / STEPS_PER_PAGE);
      if (nextPage !== currentPage) setCurrentPage(nextPage);
    }

    setTimeout(() => setActiveNotes(prev => prev.filter(n => n !== index)), 200);
  }, [playNote, appMode, focusedCell, currentPage, language]);

  const stopPlayback = () => {
    setIsPlaying(false);
    setCurrentStep(-1);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const startPlayback = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    Tone.start();
    setIsPlaying(true);
    
    // Find the last index that has a note
    let lastNoteIndex = -1;
    for (let i = FULL_STEPS - 1; i >= 0; i--) {
      if ((sequence[0][i] !== null && sequence[0][i] !== undefined) || 
          (sequence[1][i] !== null && sequence[1][i] !== undefined)) {
        lastNoteIndex = i;
        break;
      }
    }

    // Default to at least one page if empty, or stop immediately if requested
    if (lastNoteIndex === -1) {
      stopPlayback();
      return;
    }

    let step = 0;
    
    timerRef.current = setInterval(() => {
      if (step > lastNoteIndex) {
        stopPlayback();
        setFocusedCell(null);
        return;
      }
      
      setCurrentStep(step);
      
      const activePage = Math.floor(step / STEPS_PER_PAGE);
      setCurrentPage(activePage);
      
      const note0 = sequence[0][step];
      const note1 = sequence[1][step];
      const triggeredNotes: number[] = [];

      if (note0 !== null) {
        playNote(note0);
        triggeredNotes.push(note0);
      }
      if (note1 !== null) {
        playNote(note1);
        triggeredNotes.push(note1);
      }

      if (triggeredNotes.length > 0) {
        setActiveNotes(triggeredNotes);
        setTimeout(() => setActiveNotes([]), 150);
      }

      step++;
    }, (60 / tempo / 4) * 1000);
  };

  const performSave = (sequenceToSave: (number | null)[][]) => {
    let lastNoteIndex = -1;
    for (let i = FULL_STEPS - 1; i >= 0; i--) {
      if ((sequenceToSave[0][i] !== null && sequenceToSave[0][i] !== undefined) || 
          (sequenceToSave[1][i] !== null && sequenceToSave[1][i] !== undefined)) {
        lastNoteIndex = i;
        break;
      }
    }

    const trimmedSequence = [
      sequenceToSave[0].slice(0, lastNoteIndex + 1),
      sequenceToSave[1].slice(0, lastNoteIndex + 1)
    ];

    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentStep(-1);
    setFocusedCell(null);

    const data = JSON.stringify({ sequence: trimmedSequence, tempo, activeModel }, null, 2);
    
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(data).catch(() => {});
    }

    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zenpan_composition_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearSequence = () => {
    const confirmed = window.confirm(t.clearConfirm);
    if (confirmed) {
      stopPlayback();
      const empty = [
        Array.from({ length: FULL_STEPS }, () => null),
        Array.from({ length: FULL_STEPS }, () => null)
      ];
      setSequence(empty);
      setFocusedCell(null);
      setCurrentPage(0);
      setCurrentStep(-1);
    }
  };

  const handleSave = () => performSave(sequence);

  const handleLoad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);
          if (data.sequence && Array.isArray(data.sequence)) {
            const paddedSequence = data.sequence.map((hand: (number | null)[]) => {
              const newHand = [...hand];
              while (newHand.length < FULL_STEPS) {
                newHand.push(null);
              }
              return newHand.slice(0, FULL_STEPS);
            });

            setSequence(paddedSequence);
            if (data.tempo) setTempo(data.tempo);
            if (data.activeModel) setActiveModel(data.activeModel);
            alert(t.successLoad);
          }
        } catch (e) {
          alert(t.invalidFile);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden pb-20">
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold uppercase tracking-[0.2em]">{t.settings}</h2>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all">
                  <Square size={20} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* Language Settings */}
                <div className="space-y-4">
                  <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{t.language}</h3>
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5">
                    <button 
                      onClick={() => setLanguage('en')}
                      className={`flex-1 py-2 rounded-lg text-xs transition-all ${language === 'en' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
                    >
                      English
                    </button>
                    <button 
                      onClick={() => setLanguage('zh')}
                      className={`flex-1 py-2 rounded-lg text-xs transition-all ${language === 'zh' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
                    >
                      中文
                    </button>
                  </div>
                </div>

                {/* Visibility Settings */}
                <div className="space-y-4">
                  <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{t.visibility}</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'mode', label: t.showMode },
                      { key: 'models', label: t.showModels },
                      { key: 'tempo', label: t.showTempo },
                      { key: 'rotation', label: t.showRotation }
                    ].map((item) => (
                      <label key={item.key} className="flex justify-between items-center p-3 bg-slate-950/50 rounded-xl border border-white/5 cursor-pointer group">
                        <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors uppercase tracking-widest">{item.label}</span>
                        <input 
                          type="checkbox" 
                          checked={(uiVisibility as any)[item.key]} 
                          onChange={(e) => setUiVisibility((prev: any) => ({ ...prev, [item.key]: e.target.checked }))}
                          className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* About Settings */}
                <div className="pt-4 border-t border-white/5 space-y-3">
                  <div className="flex justify-between text-[10px] uppercase tracking-widest text-slate-600">
                    <span>{t.contact}</span>
                    <span className="text-blue-400 lowercase">cracks@yeah.net</span>
                  </div>
                  <div className="flex justify-between text-[10px] uppercase tracking-widest text-slate-600">
                    <span>{t.version}</span>
                    <span className="text-slate-400">1.0.0</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold uppercase tracking-[0.2em] text-xs shadow-xl shadow-blue-500/20 hover:bg-blue-500 transition-all"
                >
                  {t.close}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeModel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className={`absolute inset-0 bg-radial from-current via-transparent to-transparent opacity-10 blur-[150px] ${HANDPAN_MODELS[activeModel].color}`}
          />
        </AnimatePresence>
      </div>

      <main className="relative container mx-auto px-4 py-6 max-w-4xl flex flex-col items-center gap-8">
        {/* Nav / Model Switcher */}
        <header className="w-full flex flex-col md:flex-row justify-between items-center gap-6 relative">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Waves className="text-blue-500" />
              <h1 className="text-2xl font-light tracking-[0.3em] uppercase">ZenPan</h1>
            </div>
            
            {/* Mode Toggle */}
            {uiVisibility.mode && (
              <div className="flex items-center bg-slate-900/50 p-1 rounded-xl border border-white/5">
                <button 
                  onClick={() => setAppMode('practice')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest transition-all ${appMode === 'practice' ? 'bg-slate-800 text-white shadow-inner shadow-white/5' : 'text-slate-500'}`}
                >
                  <Brain size={12} /> {t.practice}
                </button>
                <button 
                  onClick={() => setAppMode('composition')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest transition-all ${appMode === 'composition' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
                >
                  <PenTool size={12} /> {t.composition}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {uiVisibility.models && (
              <div className="hidden lg:flex bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 backdrop-blur-sm mr-2">
                {(Object.keys(HANDPAN_MODELS) as HandpanModelKey[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setActiveModel(m)}
                    className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all ${
                      activeModel === m 
                      ? 'bg-blue-600/80 shadow-lg text-white' 
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    {HANDPAN_MODELS[m].name.split(' ')[1]}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 backdrop-blur-sm">
              <button 
                onClick={handleSave} 
                className="p-2.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                title={t.save}
              >
                <Save size={18} />
              </button>
              <button 
                onClick={handleLoad} 
                className="p-2.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                title={t.load}
              >
                <Upload size={18} />
              </button>
              <div className="w-px h-4 bg-white/10 mx-1" />
              <button 
                onClick={clearSequence}
                className="p-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title={t.clear}
              >
                <Trash2 size={18} />
              </button>
              <div className="w-px h-4 bg-white/10 mx-1" />
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                title={t.settings}
              >
                <Settings2 size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Handpan Display */}
        <div className="relative group flex items-center justify-center">
          <Handpan 
            onNoteClick={handleNotePlay} 
            activeNotes={activeNotes} 
            model={activeModel} 
            rotationAngle={rotationAngle}
          />
          
          {uiVisibility.rotation && (
            <button 
              onClick={() => setIsRotating(!isRotating)}
              className={`absolute right-0 top-1/2 -translate-y-1/2 md:-right-12 p-3 rounded-full border border-white/10 transition-all ${isRotating ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-900/50 text-slate-500 hover:text-white'}`}
              title="Toggle Auto-Rotation"
            >
              <RotateCw size={20} className={isRotating ? 'animate-spin-slow' : ''} />
            </button>
          )}

          {appMode === 'composition' && focusedCell && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900 border border-white/10 px-4 py-2 rounded-2xl shadow-2xl min-w-max">
              <div className="text-white text-[8px] uppercase tracking-[0.3em] font-bold animate-pulse">
                {t.recordingHand} {focusedCell.hand === 0 ? t.leftHand : t.rightHand} • {t.step} {focusedCell.globalStep + 1}
              </div>
            </div>
          )}
        </div>

        {/* Studio Panel */}
        <div className="w-full space-y-4">
          <div className="flex justify-between items-center px-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  const newPage = Math.max(0, currentPage - 1);
                  setCurrentPage(newPage);
                  if (appMode === 'composition' && focusedCell) setFocusedCell({ ...focusedCell, globalStep: newPage * STEPS_PER_PAGE });
                }}
                disabled={currentPage === 0}
                className="p-2 rounded-full bg-slate-900/50 text-slate-500 hover:text-white disabled:opacity-20 border border-white/5 transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-1.5 rounded-xl border border-white/5 backdrop-blur-sm">
                <span className="text-[10px] uppercase tracking-widest text-slate-500">{t.page}</span>
                <select 
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    setCurrentPage(page);
                    if (appMode === 'composition' && focusedCell) setFocusedCell({ ...focusedCell, globalStep: page * STEPS_PER_PAGE });
                  }}
                  className="bg-transparent text-sm font-mono font-bold text-blue-400 outline-none cursor-pointer"
                >
                  {Array.from({length: TOTAL_PAGES}).map((_, i) => (
                    <option key={i} value={i} className="bg-slate-900 text-white">
                      {i + 1}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-600">/ {TOTAL_PAGES}</span>
              </div>
 
               <button 
                 onClick={() => {
                   const newPage = Math.min(TOTAL_PAGES - 1, currentPage + 1);
                   setCurrentPage(newPage);
                   if (appMode === 'composition' && focusedCell) setFocusedCell({ ...focusedCell, globalStep: newPage * STEPS_PER_PAGE });
                 }}
                 disabled={currentPage === TOTAL_PAGES - 1}
                 className="p-2 rounded-full bg-slate-900/50 text-slate-500 hover:text-white disabled:opacity-20 border border-white/5 transition-all"
               >
                 <ChevronRight size={20} />
               </button>
             </div>
           </div>
 
           <Sequencer 
             fullSequence={sequence} 
             onUpdate={handleUpdateSequence} 
             currentStep={currentStep} 
             focusedCell={focusedCell}
             onFocusCell={setFocusedCell}
             appMode={appMode}
             pageIndex={currentPage}
             maxNotes={HANDPAN_MODELS[activeModel].notes.length}
             onPlayNote={handleNotePlay}
           />
 
           <div className="bg-slate-900/30 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 flex flex-col md:flex-row gap-6 items-center">
             {uiVisibility.tempo && (
               <div className="flex-1 w-full space-y-2">
                 <div className="flex justify-between text-[10px] uppercase tracking-widest text-slate-500 px-1">
                   <span>{t.tempo}</span>
                   <span>{tempo} BPM</span>
                 </div>
                 <input
                   type="range"
                   min="10"
                   max="180"
                   value={tempo}
                   onChange={(e) => setTempo(parseInt(e.target.value))}
                   className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"
                 />
               </div>
             )}
 
              <div className="flex gap-3 w-full md:w-auto">
                <button
                  onClick={isPlaying ? stopPlayback : startPlayback}
                  className={`flex-1 md:w-64 py-5 rounded-3xl flex items-center justify-center gap-3 font-bold tracking-[0.3em] uppercase text-xs transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] ${
                    isPlaying 
                    ? 'bg-red-500 shadow-red-500/20 text-white' 
                    : 'bg-blue-600 shadow-blue-500/20 text-white'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Square fill="currentColor" size={16} />
                      <span>{t.stop}</span>
                    </>
                  ) : (
                    <>
                      <Play fill="currentColor" size={14} />
                      <span>{t.play}</span>
                    </>
                  )}
                </button>
              </div>
           </div>
         </div>
 
         <footer className="w-full flex justify-between items-center pt-8 border-t border-white/5 opacity-50 grayscale hover:grayscale-0 transition-all">
           <p className="text-[10px] tracking-widest uppercase">ZenPan Studio • Infinite Resonance</p>
           <div className="flex gap-4">
             <Github size={16} className="cursor-pointer" />
             <Settings2 size={16} className="cursor-pointer" onClick={() => setShowSettings(true)} />
           </div>
         </footer>
      </main>
    </div>
  );
}

