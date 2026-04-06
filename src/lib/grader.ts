import type { SongNote } from './types'

const PERFECT_RANGE = 50 // ms
const GOOD_RANGE = 300 // ms

export type Grade = 'perfect' | 'good' | 'miss' | 'error'

export interface GradeResult {
  songNote: SongNote
  noteIndex: number // songNotes 배열 내 인덱스
  grade: Grade
  timeDiff: number // ms (양수 = 늦음, 음수 = 빠름)
}

const OFFSET_SMOOTHING = 0.3 // 새 값 반영 비율 (0~1)

export class Grader {
  private songNotes: SongNote[]
  private matched: Set<number> // songNotes 배열 인덱스
  private offset: number // 적응형 오프셋 (ms)

  constructor(songNotes: SongNote[]) {
    this.songNotes = songNotes
    this.matched = new Set()
    this.offset = 0
  }

  /** 현재 적응형 오프셋 값을 반환한다 (양수 = 늦음, 음수 = 빠름). */
  getOffset(): number {
    return this.offset
  }

  /**
   * noteOn 이벤트를 처리하여 매칭 결과를 반환한다.
   * 매칭되지 않으면 null (Error에 해당).
   */
  processNoteOn(pitch: number, timestamp: number): GradeResult | null {
    let bestIndex = -1
    let bestDiff = Infinity

    for (let i = 0; i < this.songNotes.length; i++) {
      if (this.matched.has(i)) continue

      const songNote = this.songNotes[i]
      if (songNote.pitch !== pitch) continue

      const diff = timestamp - songNote.startTime - this.offset
      const absDiff = Math.abs(diff)

      // GOOD_RANGE 밖이면 스킵
      if (absDiff > GOOD_RANGE) continue

      // 가장 가까운 매칭 선택
      if (absDiff < bestDiff) {
        bestDiff = absDiff
        bestIndex = i
      }
    }

    if (bestIndex === -1) return null

    this.matched.add(bestIndex)
    const songNote = this.songNotes[bestIndex]
    const rawDiff = timestamp - songNote.startTime
    const adjustedDiff = rawDiff - this.offset
    const absDiff = Math.abs(adjustedDiff)
    const grade = absDiff <= PERFECT_RANGE ? 'perfect' : 'good'

    // 오프셋 갱신: 이동 평균
    this.offset = this.offset * (1 - OFFSET_SMOOTHING) + rawDiff * OFFSET_SMOOTHING

    return { songNote, noteIndex: bestIndex, grade, timeDiff: rawDiff }
  }

  /**
   * 현재 시간 기준으로 GOOD_RANGE를 초과한 매칭 안 된 음표를 Miss로 확정한다.
   */
  flush(currentTime: number): GradeResult[] {
    const misses: GradeResult[] = []

    for (let i = 0; i < this.songNotes.length; i++) {
      if (this.matched.has(i)) continue

      const songNote = this.songNotes[i]
      const elapsed = currentTime - songNote.startTime - this.offset

      if (elapsed > GOOD_RANGE) {
        this.matched.add(i)
        misses.push({
          songNote,
          noteIndex: i,
          grade: 'miss',
          timeDiff: elapsed,
        })
      }
    }

    return misses
  }
}
