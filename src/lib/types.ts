export interface SongNote {
  pitch: number // MIDI note number (0-127)
  startTime: number // 시작 시간 (ms)
  duration: number // 길이 (ms)
}

export interface SessionResult {
  songNotes: SongNote[]
  gradeResults: GradeResultRecord[] // 모든 판정 기록 (시간순)
  stats: {
    perfect: number
    good: number
    miss: number
    error: number
    total: number
    accuracy: number // (perfect + good) / total
  }
}

export interface GradeResultRecord {
  noteIndex: number // songNotes 배열 인덱스 (-1 = Error, 매칭 없음)
  grade: 'perfect' | 'good' | 'miss' | 'error'
  pitch: number
  time: number // 세션 시작 기준 경과 시간 (ms)
  timeDiff: number // 기대 시간과의 차이 (ms)
}

export interface MidiNoteEvent {
  type: 'noteOn' | 'noteOff'
  pitch: number // MIDI note number (0-127)
  velocity: number // 0-127
  timestamp: number // performance.now() 기준 (ms)
}
