import type { SongNote } from './types'

// OSMD 내부 타입 (런타임에만 존재, 최소한의 인터페이스만 정의)
interface OsmdFraction {
  RealValue: number
}

interface OsmdPitch {
  getHalfTone: () => number
}

interface OsmdNote {
  halfTone: number
  Pitch: OsmdPitch | null
  Length: OsmdFraction
  isRest: () => boolean
  NoteTie: { StartNote: OsmdNote } | null
}

interface OsmdVoiceEntry {
  Notes: OsmdNote[]
  IsGrace: boolean
}

interface OsmdStaffEntry {
  VoiceEntries: OsmdVoiceEntry[]
}

interface OsmdVerticalContainer {
  getAbsoluteTimestamp: () => OsmdFraction
  StaffEntries: (OsmdStaffEntry | null)[]
}

interface OsmdMeasure {
  VerticalSourceStaffEntryContainers: OsmdVerticalContainer[]
  TempoExpressions: { InstantaneousTempo?: { TempoInBpm: number } }[]
  TempoInBPM: number
}

interface OsmdSheet {
  SourceMeasures: OsmdMeasure[]
  DefaultStartTempoInBpm: number
}

function fractionToMs(realValue: number, bpm: number): number {
  // OSMD Fraction.RealValue는 whole note 기준 (1.0 = whole note)
  // BPM은 quarter note 기준이므로 whole note = 4 beats
  const beats = realValue * 4
  return (beats / bpm) * 60 * 1000
}

export function extractNoteSequence(sheet: OsmdSheet): SongNote[] {
  const notes: SongNote[] = []
  let currentBpm =
    sheet.DefaultStartTempoInBpm > 0 ? sheet.DefaultStartTempoInBpm : 120

  for (const measure of sheet.SourceMeasures) {
    // 마디별 템포 갱신
    if (measure.TempoInBPM > 0) {
      currentBpm = measure.TempoInBPM
    }
    for (const tempoExpr of measure.TempoExpressions) {
      if (tempoExpr.InstantaneousTempo?.TempoInBpm) {
        currentBpm = tempoExpr.InstantaneousTempo.TempoInBpm
      }
    }

    for (const container of measure.VerticalSourceStaffEntryContainers) {
      const absTimestamp = container.getAbsoluteTimestamp()
      const startTime = fractionToMs(absTimestamp.RealValue, currentBpm)

      for (const staffEntry of container.StaffEntries) {
        if (!staffEntry) continue

        for (const voiceEntry of staffEntry.VoiceEntries) {
          if (voiceEntry.IsGrace) continue

          for (const note of voiceEntry.Notes) {
            if (note.isRest()) continue

            // 타이 음표: 시작 음표가 아닌 경우 스킵 (중복 방지)
            if (note.NoteTie && note.NoteTie.StartNote !== note) continue

            const pitch = note.Pitch ? note.Pitch.getHalfTone() : note.halfTone

            notes.push({
              pitch,
              startTime: Math.round(startTime),
              duration: Math.round(
                fractionToMs(note.Length.RealValue, currentBpm),
              ),
            })
          }
        }
      }
    }
  }

  notes.sort((a, b) => a.startTime - b.startTime)
  return notes
}
