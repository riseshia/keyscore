import type { Grade } from './grader'

const GRADE_COLORS: Record<Grade, string> = {
  perfect: '#00cc00',
  good: '#cccc00',
  miss: '#cc0000',
  error: '#999999',
}

const DEFAULT_COLOR = '#000000'

const COLORING_OPTIONS = {
  applyToNoteheads: true,
  applyToStem: true,
  applyToBeams: true,
  applyToFlag: true,
  applyToLedgerLines: true,
}

// 등급 우선순위: 높을수록 "나쁜" 결과 (같은 음표의 두 번 결과 중 나쁜 쪽 표시용)
const GRADE_PRIORITY: Record<Grade, number> = {
  perfect: 0,
  good: 1,
  miss: 2,
  error: 3,
}

/**
 * 같은 OSMD Note에 대한 판정 결과를 추적하여 worst grade로 색칠한다.
 * 도돌이표 등으로 같은 음표가 여러 번 판정될 때 사용.
 */
export class ScoreColorTracker {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private noteGrades = new Map<any, Grade>()

  /**
   * 음표에 판정 색상을 적용한다.
   * 이미 색칠된 음표는 더 나쁜 결과일 때만 덮어쓴다.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  colorize(osmd: any, osmdNote: any, grade: Grade): void {
    const existing = this.noteGrades.get(osmdNote)
    if (existing && GRADE_PRIORITY[existing] >= GRADE_PRIORITY[grade]) {
      return // 기존 결과가 같거나 더 나쁘면 유지
    }

    this.noteGrades.set(osmdNote, grade)

    const graphicalNote = osmd.rules?.GNote(osmdNote)
    if (!graphicalNote) return

    const color = GRADE_COLORS[grade]
    graphicalNote.setColor(color, COLORING_OPTIONS)
  }

  /**
   * 모든 색상을 기본값으로 리셋한다.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resetAll(osmd: any, osmdNotes: any[]): void {
    // 중복 제거 (반복 구간에서 같은 OSMD Note 참조)
    const unique = new Set(osmdNotes)
    for (const osmdNote of unique) {
      const graphicalNote = osmd.rules?.GNote(osmdNote)
      if (!graphicalNote) continue
      graphicalNote.setColor(DEFAULT_COLOR, COLORING_OPTIONS)
    }
    this.noteGrades.clear()
  }
}
