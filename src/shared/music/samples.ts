// How each instrument in the catalogue is voiced. Kept free of imports so the sample-fetch
// script can load it directly with Node.

export type Register = 'bass' | 'mid' | 'high'

export type Voice =
  | { kind: 'sampled'; gm: string; register: Register; release?: number; gain?: number }
  | {
      kind: 'synth'
      synth: 'fatsaw' | 'sine' | 'square' | 'triangle'
      release?: number
      gain?: number
    }
  | { kind: 'none' }

/** Instrument id → voice. Pitched instruments use the FluidR3 General MIDI soundfont. */
export const VOICES: Record<string, Voice> = {
  // Bass
  'synth-bass': { kind: 'sampled', gm: 'synth_bass_1', register: 'bass', release: 0.2 },
  'electric-bass': { kind: 'sampled', gm: 'electric_bass_finger', register: 'bass', release: 0.3 },
  'funk-bass': { kind: 'sampled', gm: 'slap_bass_1', register: 'bass', release: 0.2 },
  'sub-bass': { kind: 'synth', synth: 'sine', release: 0.3, gain: 1.2 },
  'acoustic-bass': { kind: 'sampled', gm: 'acoustic_bass', register: 'bass', release: 0.4 },
  'soft-bass': { kind: 'sampled', gm: 'fretless_bass', register: 'bass', release: 0.6, gain: 0.8 },
  cello: { kind: 'sampled', gm: 'cello', register: 'bass', release: 0.6 },
  // Chords
  piano: { kind: 'sampled', gm: 'acoustic_grand_piano', register: 'mid', release: 1 },
  'electric-piano': { kind: 'sampled', gm: 'electric_piano_1', register: 'mid', release: 1 },
  'acoustic-guitar': {
    kind: 'sampled',
    gm: 'acoustic_guitar_steel',
    register: 'mid',
    release: 0.8
  },
  'electric-guitar': {
    kind: 'sampled',
    gm: 'electric_guitar_clean',
    register: 'mid',
    release: 0.6
  },
  ukulele: { kind: 'sampled', gm: 'acoustic_guitar_nylon', register: 'mid', release: 0.6 },
  harp: { kind: 'sampled', gm: 'orchestral_harp', register: 'mid', release: 1.5 },
  supersaw: { kind: 'synth', synth: 'fatsaw', release: 0.5, gain: 0.5 },
  strings: { kind: 'sampled', gm: 'string_ensemble_1', register: 'mid', release: 1, gain: 0.8 },
  // Pads
  'warm-pad': { kind: 'sampled', gm: 'pad_2_warm', register: 'mid', release: 1.5, gain: 0.7 },
  organ: { kind: 'sampled', gm: 'drawbar_organ', register: 'mid', release: 0.3, gain: 0.6 },
  choir: { kind: 'sampled', gm: 'choir_aahs', register: 'mid', release: 1.2, gain: 0.8 },
  // Melody
  'bell-lead': { kind: 'sampled', gm: 'vibraphone', register: 'high', release: 1 },
  'synth-lead': { kind: 'sampled', gm: 'lead_1_square', register: 'high', release: 0.3, gain: 0.6 },
  'lead-guitar': {
    kind: 'sampled',
    gm: 'overdriven_guitar',
    register: 'high',
    release: 0.4,
    gain: 0.8
  },
  'music-box': { kind: 'sampled', gm: 'music_box', register: 'high', release: 1.5 },
  flute: { kind: 'sampled', gm: 'flute', register: 'high', release: 0.4 },
  sax: { kind: 'sampled', gm: 'alto_sax', register: 'high', release: 0.3 },
  brass: { kind: 'sampled', gm: 'trumpet', register: 'high', release: 0.3 },
  banjo: { kind: 'sampled', gm: 'banjo', register: 'high', release: 0.6 },
  whistle: { kind: 'sampled', gm: 'whistle', register: 'high', release: 0.3, gain: 0.8 },
  none: { kind: 'none' }
}

/** Which sample notes we keep for each register (Tone's Sampler repitches between them). */
export const REGISTER_NOTES: Record<Register, string[]> = {
  bass: ['E1', 'Ab1', 'C2', 'E2', 'Ab2', 'C3', 'E3', 'Ab3', 'C4'],
  mid: ['C3', 'E3', 'Ab3', 'C4', 'E4', 'Ab4', 'C5', 'E5', 'Ab5', 'C6'],
  high: ['C4', 'E4', 'Ab4', 'C5', 'E5', 'Ab5', 'C6', 'E6', 'Ab6']
}

export const DRUM_SOUNDS = ['kick', 'snare', 'hihat', 'tom1', 'tom2', 'tom3'] as const
export type DrumSound = (typeof DRUM_SOUNDS)[number]

/** Drum kit id → sample folder and mix tweaks. */
export const DRUM_KITS: Record<string, { folder: string; gain?: number; reverb?: number }> = {
  'pop-kit': { folder: 'LINN' },
  'rock-kit': { folder: 'acoustic-kit', gain: 1.1 },
  'disco-kit': { folder: 'LINN' },
  'boom-kit': { folder: 'Kit8' },
  'electro-kit': { folder: 'Techno' },
  'brush-kit': { folder: 'acoustic-kit', gain: 0.55 },
  'reggae-kit': { folder: 'CR78' },
  'orchestral-kit': { folder: 'acoustic-kit', gain: 0.7, reverb: 0.5 },
  'epic-kit': { folder: 'acoustic-kit', gain: 1.2, reverb: 0.6 },
  none: { folder: '' }
}

export const SAMPLE_SOURCES = {
  gm: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM',
  drums: 'https://tonejs.github.io/audio/drum-samples'
}
