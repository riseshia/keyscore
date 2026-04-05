import type { Grade } from './grader'

const GRADE_COLORS: Record<Grade, string> = {
  perfect: '#00cc00',
  good: '#cccc00',
  miss: '#cc0000',
  error: '#cc0000',
}

const DEFAULT_COLOR = '#000000'

const COLORING_OPTIONS = {
  applyToNoteheads: true,
  applyToStem: true,
  applyToBeams: true,
  applyToFlag: true,
  applyToLedgerLines: true,
}

/**
 * OSMD 악보의 특정 음표에 판정 색상을 입힌다.
 *
 * @param osmd - OpenSheetMusicDisplay 인스턴스
 * @param osmdNote - OSMD 내부 Note 객체 (extractNoteSequenceWithRefs에서 반환)
 * @param grade - 판정 등급
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function colorizeNote(osmd: any, osmdNote: any, grade: Grade): void {
  const graphicalNote = osmd.rules?.GNote(osmdNote)
  if (!graphicalNote) return

  const color = GRADE_COLORS[grade]
  graphicalNote.setColor(color, COLORING_OPTIONS)
}

/**
 * OSMD 악보의 특정 음표의 색상을 기본값(검정)으로 되돌린다.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resetNoteColor(osmd: any, osmdNote: any): void {
  const graphicalNote = osmd.rules?.GNote(osmdNote)
  if (!graphicalNote) return

  graphicalNote.setColor(DEFAULT_COLOR, COLORING_OPTIONS)
}

/**
 * 전체 음표의 색상을 기본값으로 되돌린다.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resetAllNoteColors(osmd: any, osmdNotes: any[]): void {
  for (const osmdNote of osmdNotes) {
    resetNoteColor(osmd, osmdNote)
  }
}
