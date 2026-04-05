import type { SongNote } from './types'

function fractionToMs(realValue: number, bpm: number): number {
  // OSMD Fraction.RealValue는 whole note 기준 (1.0 = whole note)
  // BPM은 quarter note 기준이므로 whole note = 4 beats
  const beats = realValue * 4
  return (beats / bpm) * 60 * 1000
}

export interface NoteSequenceResult {
  notes: SongNote[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  osmdNotes: any[] // OSMD Note 객체 배열 (notes와 같은 인덱스, 반복 구간은 같은 객체 중복)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractNoteSequence(sheet: any): SongNote[] {
  return extractNoteSequenceWithRefs(sheet).notes
}

/**
 * MusicPartManagerIterator를 사용하여 재생 순서(반복 포함)로 음표를 추출한다.
 * CurrentEnrolledTimestamp로 누적 재생 시간을 계산하므로 도돌이표를 올바르게 처리한다.
 *
 * MusicPartManager가 없는 경우(테스트 등) SourceMeasures 기반 fallback을 사용한다.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractNoteSequenceWithRefs(sheet: any): NoteSequenceResult {
  if (sheet.MusicPartManager) {
    return extractViaIterator(sheet)
  }
  return extractViaSourceMeasures(sheet)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractViaIterator(sheet: any): NoteSequenceResult {
  const entries: { note: SongNote; osmdNote: unknown }[] = []
  const iterator = sheet.MusicPartManager.getIterator()
  const seenNotes = new Set<unknown>() // 같은 beat 위치의 중복 처리 방지

  while (!iterator.EndReached) {
    const bpm = iterator.CurrentBpm > 0 ? iterator.CurrentBpm : 120
    const enrolledTimestamp = iterator.CurrentEnrolledTimestamp
    const startTime = fractionToMs(enrolledTimestamp.RealValue, bpm)

    // 이 beat 위치에서 시작하는 note 수집 (같은 beat에 같은 note 중복 방지)
    seenNotes.clear()
    for (const voiceEntry of iterator.CurrentVoiceEntries) {
      if (voiceEntry.IsGrace) continue

      for (const note of voiceEntry.Notes) {
        if (note.isRest()) continue
        if (note.NoteTie && note.NoteTie.StartNote !== note) continue
        if (seenNotes.has(note)) continue
        seenNotes.add(note)

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
              fractionToMs(note.Length.RealValue, bpm),
            ),
          },
          osmdNote: note,
        })
      }
    }

    iterator.moveToNext()
  }

  entries.sort((a, b) => a.note.startTime - b.note.startTime)
  return {
    notes: entries.map((e) => e.note),
    osmdNotes: entries.map((e) => e.osmdNote),
  }
}

/**
 * SourceMeasures 기반 fallback (반복 구간 미지원).
 * MusicPartManager가 없는 환경(MusicSheetReader 직접 사용 등)에서 사용.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractViaSourceMeasures(sheet: any): NoteSequenceResult {
  const entries: { note: SongNote; osmdNote: unknown }[] = []
  const defaultBpm = sheet.DefaultStartTempoInBpm > 0 ? sheet.DefaultStartTempoInBpm : 120

  for (const measure of sheet.SourceMeasures) {
    for (const staffEntry of measure.VerticalSourceStaffEntryContainers) {
      for (const entry of staffEntry.StaffEntries) {
        if (!entry) continue
        for (const voiceEntry of entry.VoiceEntries) {
          if (voiceEntry.IsGrace) continue
          for (const note of voiceEntry.Notes) {
            if (note.isRest()) continue
            if (note.NoteTie && note.NoteTie.StartNote !== note) continue

            const rawPitch = note.Pitch
              ? note.Pitch.getHalfTone()
              : note.halfTone
            const pitch = rawPitch + 12

            const timestamp = note.getAbsoluteTimestamp()
            const startTime = fractionToMs(timestamp.RealValue, defaultBpm)

            entries.push({
              note: {
                pitch,
                startTime: Math.round(startTime),
                duration: Math.round(
                  fractionToMs(note.Length.RealValue, defaultBpm),
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
