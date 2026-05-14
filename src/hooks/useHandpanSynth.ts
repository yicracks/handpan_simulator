import * as Tone from 'tone';
import { useCallback, useRef, useEffect } from 'react';

// D Celtic Minor Scale for the Handpan
// Scales and configurations for different Handpans
export const HANDPAN_MODELS = {
  'celtic': {
    name: 'D Celtic Minor',
    notes: ['D3', 'A3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'C5'],
    color: 'from-blue-500/20',
    bodyColor: ['#475569', '#1e293b', '#0f172a']
  },
  'hijaz': {
    name: 'G Hijaz',
    notes: ['G3', 'D4', 'Eb4', 'F#4', 'G4', 'A4', 'Bb4', 'C5', 'D5'],
    color: 'from-orange-500/20',
    bodyColor: ['#78350f', '#451a03', '#1c0d02']
  },
  'pygmy': {
    name: 'F Pygmy',
    notes: ['F3', 'C4', 'Db4', 'F4', 'Ab4', 'Bb4', 'C5', 'Eb5', 'F5'],
    color: 'from-emerald-500/20',
    bodyColor: ['#064e3b', '#064e3b', '#022c22']
  },
  'integral': {
    name: 'A Integral',
    notes: ['A2', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4'],
    color: 'from-purple-500/20',
    bodyColor: ['#581c87', '#3b0764', '#1e1b4b']
  }
};

export function getNearestHandpanNote(hz: number, modelKey: HandpanModelKey): number | null {
  const notes = HANDPAN_MODELS[modelKey].notes;
  let minDiff = Infinity;
  let nearestIdx = -1;

  notes.forEach((note, i) => {
    const targetHz = Tone.Frequency(note).toFrequency();
    const diff = Math.abs(hz - targetHz);
    if (diff < minDiff) {
      minDiff = diff;
      nearestIdx = i;
    }
  });

  // Always return the nearest note, even if it's far
  return nearestIdx;
}

export type HandpanModelKey = keyof typeof HANDPAN_MODELS;

export function useHandpanSynth(modelKey: HandpanModelKey = 'celtic') {
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const currentModel = HANDPAN_MODELS[modelKey];

  useEffect(() => {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 3.5, sustain: 0.01, release: 1.5 },
      volume: -10
    }).toDestination();

    const reverb = new Tone.Reverb({ decay: 5, wet: 0.5 }).toDestination();
    synth.connect(reverb);

    synthRef.current = synth;
    return () => {
      synth.dispose();
      reverb.dispose();
    };
  }, []);

  const playNote = useCallback((index: number, time?: number) => {
    if (!synthRef.current) return;
    const notes = HANDPAN_MODELS[modelKey].notes;
    const note = notes[index % notes.length];
    
    // Complex overtones for handpan sound
    synthRef.current.triggerAttackRelease(note, '4n', time);
    const octave = Tone.Frequency(note).transpose(12).toNote();
    synthRef.current.triggerAttackRelease(octave, '4n', time, 0.3);
  }, [modelKey]);

  return { playNote };
}
