import type { SongNote } from './types'

// OSMD 내부 데이터 구조 (참고용):
// Sheet.SourceMeasures[].VerticalSourceStaffEntryContainers[]
//   .StaffEntries[].VoiceEntries[].Notes[]
// Note: { halfTone, Pitch.getHalfTone(), Length.RealValue, isRest(), NoteTie }

function fractionToMs(realValue: number, bpm: number): number {
  // OSMD Fraction.RealValue는 whole note 기준 (1.0 = whole note)
  // BPM은 quarter note 기준이므로 whole note = 4 beats
  const beats = realValue * 4
  return (beats / bpm) * 60 * 1000
}

export interface NoteSequenceResult {
  notes: SongNote[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  osmdNotes: any[] // OSMD Note 객체 배열 (notes와 같은 인덱스)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractNoteSequence(sheet: any): SongNote[] {
  return extractNoteSequenceWithRefs(sheet).notes
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractNoteSequenceWithRefs(sheet: any): NoteSequenceResult {
  const entries: { note: SongNote; osmdNote: unknown }[] = []
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

            // OSMD의 getHalfTone()은 표준 MIDI보다 1옥타브(12) 낮은 값을 반환
            const rawPitch = note.Pitch
              ? note.Pitch.getHalfTone()
              : note.halfTone
            const pitch = rawPitch + 12

            entries.push({
              note: {
                pitch,
                startTime: Math.round(startTime),
                duration: Math.round(
                  fractionToMs(note.Length.RealValue, currentBpm),
                ),
              },
              osmdNote: note,
            })
          }
        }
      }
    }
  }

  entries.sort((a, b) => a.note.startTime - b.note.startTime)
  return {
    notes: entries.map((e) => e.note),
    osmdNotes: entries.map((e) => e.osmdNote),
  }
}
