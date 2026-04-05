export interface SongNote {
  pitch: number // MIDI note number (0-127)
  startTime: number // 시작 시간 (ms)
  duration: number // 길이 (ms)
}

export interface MidiNoteEvent {
  type: 'noteOn' | 'noteOff'
  pitch: number // MIDI note number (0-127)
  velocity: number // 0-127
  timestamp: number // performance.now() 기준 (ms)
}
