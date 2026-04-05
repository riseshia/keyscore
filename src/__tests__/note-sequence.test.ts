import { describe, expect, it } from 'vitest'
import { extractNoteSequence } from '../lib/note-sequence'

// OSMD 내부 데이터를 모킹하기 위한 헬퍼
function createFraction(numerator: number, denominator: number) {
  return {
    RealValue: numerator / denominator,
    Numerator: numerator,
    Denominator: denominator,
  }
}

function createNote(
  halfTone: number,
  length: { numerator: number; denominator: number },
  opts: {
    isRest?: boolean
    noteTie?: { StartNote: unknown } | null
    isGrace?: boolean
  } = {},
) {
  const note = {
    halfTone,
    Pitch: opts.isRest ? null : { getHalfTone: () => halfTone },
    Length: createFraction(length.numerator, length.denominator),
    isRest: () => opts.isRest ?? false,
    NoteTie: opts.noteTie ?? (null as { StartNote: unknown } | null),
  }
  return { note, isGrace: opts.isGrace ?? false }
}

interface BeatEntry {
  enrolledTimestamp: { numerator: number; denominator: number }
  notes: ReturnType<typeof createNote>[]
  bpm: number
}

/**
 * MusicPartManagerIterator를 mock하는 sheet 객체를 생성한다.
 * beats 배열의 각 항목이 iterator의 한 스텝에 대응.
 */
function createMockSheet(beats: BeatEntry[]) {
  return {
    MusicPartManager: {
      getIterator: () => {
        let index = 0
        return {
          get EndReached() {
            return index >= beats.length
          },
          get CurrentBpm() {
            return beats[index]?.bpm ?? 120
          },
          get CurrentEnrolledTimestamp() {
            const b = beats[index]
            return b
              ? createFraction(b.enrolledTimestamp.numerator, b.enrolledTimestamp.denominator)
              : createFraction(0, 1)
          },
          get CurrentVoiceEntries() {
            if (index >= beats.length) return []
            const b = beats[index]
            // 그루핑: isGrace가 같은 note들을 하나의 VoiceEntry로
            const regular: { Notes: unknown[]; IsGrace: boolean }[] = []
            const grace: { Notes: unknown[]; IsGrace: boolean }[] = []
            for (const n of b.notes) {
              if (n.isGrace) {
                grace.push({ Notes: [n.note], IsGrace: true })
              } else {
                if (regular.length === 0) {
                  regular.push({ Notes: [], IsGrace: false })
                }
                regular[0].Notes.push(n.note)
              }
            }
            return [...grace, ...regular]
          },
          moveToNext() {
            index++
          },
        }
      },
    },
  }
}

describe('extractNoteSequence', () => {
  it('단일 음표를 추출한다', () => {
    const sheet = createMockSheet([
      {
        enrolledTimestamp: { numerator: 0, denominator: 1 },
        notes: [createNote(60, { numerator: 1, denominator: 4 })],
        bpm: 120,
      },
    ])

    const notes = extractNoteSequence(sheet)
    expect(notes).toHaveLength(1)
    expect(notes[0].pitch).toBe(72) // OSMD raw 60 + 12 offset = MIDI 72
    expect(notes[0].startTime).toBe(0)
    expect(notes[0].duration).toBe(500) // 1/4 note at 120 BPM = 500ms
  })

  it('쉼표는 제외한다', () => {
    const sheet = createMockSheet([
      {
        enrolledTimestamp: { numerator: 0, denominator: 1 },
        notes: [createNote(0, { numerator: 1, denominator: 4 }, { isRest: true })],
        bpm: 120,
      },
    ])

    const notes = extractNoteSequence(sheet)
    expect(notes).toHaveLength(0)
  })

  it('BPM에 따라 타이밍을 계산한다', () => {
    const sheet = createMockSheet([
      {
        enrolledTimestamp: { numerator: 0, denominator: 1 },
        notes: [createNote(60, { numerator: 1, denominator: 4 })],
        bpm: 60, // 60 BPM = 1 beat per second
      },
      {
        enrolledTimestamp: { numerator: 1, denominator: 4 },
        notes: [createNote(62, { numerator: 1, denominator: 4 })],
        bpm: 60,
      },
    ])

    const notes = extractNoteSequence(sheet)
    expect(notes).toHaveLength(2)
    expect(notes[0].startTime).toBe(0)
    expect(notes[0].duration).toBe(1000) // 1/4 at 60 BPM = 1000ms
    expect(notes[1].startTime).toBe(1000)
    expect(notes[1].duration).toBe(1000)
  })

  it('grace note는 제외한다', () => {
    const sheet = createMockSheet([
      {
        enrolledTimestamp: { numerator: 0, denominator: 1 },
        notes: [
          createNote(60, { numerator: 1, denominator: 16 }, { isGrace: true }),
          createNote(62, { numerator: 1, denominator: 4 }),
        ],
        bpm: 120,
      },
    ])

    const notes = extractNoteSequence(sheet)
    expect(notes).toHaveLength(1)
    expect(notes[0].pitch).toBe(74) // OSMD raw 62 + 12
  })

  it('startTime 순으로 정렬된다', () => {
    // beats를 역순으로 넣어도 정렬되어야 함
    const sheet = createMockSheet([
      {
        enrolledTimestamp: { numerator: 1, denominator: 4 },
        notes: [createNote(62, { numerator: 1, denominator: 4 })],
        bpm: 120,
      },
      {
        enrolledTimestamp: { numerator: 0, denominator: 1 },
        notes: [createNote(60, { numerator: 1, denominator: 4 })],
        bpm: 120,
      },
    ])

    const notes = extractNoteSequence(sheet)
    expect(notes).toHaveLength(2)
    expect(notes[0].pitch).toBe(72) // OSMD raw 60 + 12
    expect(notes[1].pitch).toBe(74) // OSMD raw 62 + 12
  })
})
