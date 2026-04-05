export interface SongNote {
  pitch: number // MIDI note number (0-127)
  startTime: number // 시작 시간 (ms)
  duration: number // 길이 (ms)
  hand: 'left' | 'right'
}
