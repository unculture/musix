import type { PartRole } from '../project'

// Every instrument the engine can play. The composer may only choose from these,
// and the track editor shows them as picture tiles.
export interface InstrumentInfo {
  id: string
  label: string
  emoji: string
  role: PartRole
}

export const INSTRUMENTS: InstrumentInfo[] = [
  // Drum kits
  { id: 'pop-kit', label: 'Pop drums', emoji: '🥁', role: 'drums' },
  { id: 'rock-kit', label: 'Rock drums', emoji: '🤘', role: 'drums' },
  { id: 'disco-kit', label: 'Disco drums', emoji: '🪩', role: 'drums' },
  { id: 'boom-kit', label: 'Boom-bap drums', emoji: '🧢', role: 'drums' },
  { id: 'electro-kit', label: 'Electro drums', emoji: '🤖', role: 'drums' },
  { id: 'brush-kit', label: 'Soft brushes', emoji: '🧹', role: 'drums' },
  { id: 'reggae-kit', label: 'Reggae drums', emoji: '🌴', role: 'drums' },
  { id: 'orchestral-kit', label: 'Orchestra drums', emoji: '🎻', role: 'drums' },
  { id: 'epic-kit', label: 'Big movie drums', emoji: '💥', role: 'drums' },
  { id: 'none', label: 'No drums', emoji: '🤫', role: 'drums' },
  // Bass
  { id: 'synth-bass', label: 'Synth bass', emoji: '🎛️', role: 'bass' },
  { id: 'electric-bass', label: 'Bass guitar', emoji: '🎸', role: 'bass' },
  { id: 'funk-bass', label: 'Funky bass', emoji: '🕺', role: 'bass' },
  { id: 'sub-bass', label: 'Deep bass', emoji: '🔊', role: 'bass' },
  { id: 'acoustic-bass', label: 'Double bass', emoji: '🎻', role: 'bass' },
  { id: 'soft-bass', label: 'Soft bass', emoji: '🧸', role: 'bass' },
  { id: 'cello', label: 'Cello', emoji: '🎻', role: 'bass' },
  // Chords
  { id: 'piano', label: 'Piano', emoji: '🎹', role: 'chords' },
  { id: 'electric-piano', label: 'Electric piano', emoji: '🎹', role: 'chords' },
  { id: 'acoustic-guitar', label: 'Acoustic guitar', emoji: '🪕', role: 'chords' },
  { id: 'electric-guitar', label: 'Electric guitar', emoji: '🎸', role: 'chords' },
  { id: 'ukulele', label: 'Ukulele', emoji: '🌺', role: 'chords' },
  { id: 'harp', label: 'Harp', emoji: '🪉', role: 'chords' },
  { id: 'supersaw', label: 'Big synth', emoji: '⚡', role: 'chords' },
  { id: 'strings', label: 'Strings', emoji: '🎻', role: 'chords' },
  // Pads
  { id: 'warm-pad', label: 'Warm pad', emoji: '☁️', role: 'pad' },
  { id: 'organ', label: 'Organ', emoji: '⛪', role: 'pad' },
  { id: 'strings', label: 'Strings', emoji: '🎻', role: 'pad' },
  { id: 'choir', label: 'Choir', emoji: '👼', role: 'pad' },
  { id: 'none', label: 'Nothing', emoji: '🤫', role: 'pad' },
  // Melody (the guide tune she sings along with)
  { id: 'bell-lead', label: 'Bells', emoji: '🔔', role: 'melody' },
  { id: 'synth-lead', label: 'Synth', emoji: '🎛️', role: 'melody' },
  { id: 'lead-guitar', label: 'Guitar', emoji: '🎸', role: 'melody' },
  { id: 'music-box', label: 'Music box', emoji: '🎁', role: 'melody' },
  { id: 'flute', label: 'Flute', emoji: '🪈', role: 'melody' },
  { id: 'sax', label: 'Saxophone', emoji: '🎷', role: 'melody' },
  { id: 'brass', label: 'Trumpet', emoji: '🎺', role: 'melody' },
  { id: 'banjo', label: 'Banjo', emoji: '🪕', role: 'melody' },
  { id: 'whistle', label: 'Whistle', emoji: '😗', role: 'melody' },
  { id: 'piano', label: 'Piano', emoji: '🎹', role: 'melody' }
]

export const instrumentsFor = (role: PartRole): InstrumentInfo[] =>
  INSTRUMENTS.filter((i) => i.role === role)

export const instrumentInfo = (role: PartRole, id: string): InstrumentInfo | undefined =>
  INSTRUMENTS.find((i) => i.role === role && i.id === id)

export const DRUM_STYLES = [
  'pop',
  'rock',
  'disco',
  'hiphop',
  'house',
  'country',
  'reggae',
  'swing',
  'orchestral',
  'epic',
  'none'
] as const
export type DrumStyle = (typeof DRUM_STYLES)[number]
