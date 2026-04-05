import type { SongNote } from './types'

const PERFECT_RANGE = 50 // ms
const GOOD_RANGE = 300 // ms

export type Grade = 'perfect' | 'good' | 'miss' | 'error'

export interface GradeResult {
  songNote: SongNote
  grade: Grade
  timeDiff: number // ms (양수 = 늦음, 음수 = 빠름)
}

export class Grader {
  private songNotes: SongNote[]
  private matched: Set<number> // songNotes 배열 인덱스

  constructor(songNotes: SongNote[]) {
    this.songNotes = songNotes
    this.matched = new Set()
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

      const diff = timestamp - songNote.startTime
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
    const timeDiff = timestamp - songNote.startTime
    const grade = bestDiff <= PERFECT_RANGE ? 'perfect' : 'good'

    return { songNote, grade, timeDiff }
  }

  /**
   * 현재 시간 기준으로 GOOD_RANGE를 초과한 매칭 안 된 음표를 Miss로 확정한다.
   */
  flush(currentTime: number): GradeResult[] {
    const misses: GradeResult[] = []

    for (let i = 0; i < this.songNotes.length; i++) {
      if (this.matched.has(i)) continue

      const songNote = this.songNotes[i]
      const elapsed = currentTime - songNote.startTime

      if (elapsed > GOOD_RANGE) {
        this.matched.add(i)
        misses.push({
          songNote,
          grade: 'miss',
          timeDiff: elapsed,
        })
      }
    }

    return misses
  }
}
