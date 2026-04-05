import { describe, expect, it } from 'vitest'
import { extractNoteSequence } from '../lib/note-sequence'
import type { SongNote } from '../lib/types'

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
  opts: { isRest?: boolean; noteTie?: unknown; isGrace?: boolean } = {},
) {
  return {
    halfTone, // Pitch.getHalfTone() 우선 사용, fallback용
    Pitch: opts.isRest ? null : { getHalfTone: () => halfTone },
    Length: createFraction(length.numerator, length.denominator),
    isRest: () => opts.isRest ?? false,
    NoteTie: opts.noteTie ?? null,
  }
}

function createVoiceEntry(
  notes: ReturnType<typeof createNote>[],
  isGrace = false,
) {
  return { Notes: notes, IsGrace: isGrace }
}

function createStaffEntry(
  voiceEntries: ReturnType<typeof createVoiceEntry>[],
) {
  return {
    VoiceEntries: voiceEntries,
  }
}

function createVerticalContainer(
  timestamp: { numerator: number; denominator: number },
  staffEntries: (ReturnType<typeof createStaffEntry> | null)[],
  measureAbsTimestamp: { numerator: number; denominator: number },
) {
  return {
    Timestamp: createFraction(timestamp.numerator, timestamp.denominator),
    getAbsoluteTimestamp: () => {
      const mN = measureAbsTimestamp.numerator
      const mD = measureAbsTimestamp.denominator
      const tN = timestamp.numerator
      const tD = timestamp.denominator
      return createFraction(mN * tD + tN * mD, mD * tD)
    },
    StaffEntries: staffEntries,
    $get$: (index: number) => staffEntries[index] ?? null,
  }
}

function createMeasure(
  absTimestamp: { numerator: number; denominator: number },
  containers: ReturnType<typeof createVerticalContainer>[],
  tempoInBPM?: number,
) {
  return {
    AbsoluteTimestamp: createFraction(
      absTimestamp.numerator,
      absTimestamp.denominator,
    ),
    VerticalSourceStaffEntryContainers: containers,
    TempoExpressions: [],
    TempoInBPM: tempoInBPM ?? 0,
  }
}

function createMockSheet(
  measures: ReturnType<typeof createMeasure>[],
  defaultTempo = 120,
) {
  return {
    SourceMeasures: measures,
    DefaultStartTempoInBpm: defaultTempo,
  }
}

describe('extractNoteSequence', () => {
  it('단일 음표를 추출한다', () => {
    const sheet = createMockSheet([
      createMeasure(
        { numerator: 0, denominator: 1 },
        [
          createVerticalContainer(
            { numerator: 0, denominator: 1 },
            [
              createStaffEntry([
                createVoiceEntry([
                  createNote(60, { numerator: 1, denominator: 4 }),
                ]),
              ]),
            ],
            { numerator: 0, denominator: 1 },
          ),
        ],
        120,
      ),
    ])

    const notes = extractNoteSequence(sheet)
    expect(notes).toHaveLength(1)
    expect(notes[0].pitch).toBe(60)
    expect(notes[0].startTime).toBe(0)
    expect(notes[0].duration).toBe(500) // 1/4 note at 120 BPM = 500ms
  })

  it('쉼표는 제외한다', () => {
    const sheet = createMockSheet([
      createMeasure(
        { numerator: 0, denominator: 1 },
        [
          createVerticalContainer(
            { numerator: 0, denominator: 1 },
            [
              createStaffEntry([
                createVoiceEntry([
                  createNote(
                    0,
                    { numerator: 1, denominator: 4 },
                    { isRest: true },
                  ),
                ]),
              ]),
            ],
            { numerator: 0, denominator: 1 },
          ),
        ],
        120,
      ),
    ])

    const notes = extractNoteSequence(sheet)
    expect(notes).toHaveLength(0)
  })

  it('BPM에 따라 타이밍을 계산한다', () => {
    const sheet = createMockSheet([
      createMeasure(
        { numerator: 0, denominator: 1 },
        [
          createVerticalContainer(
            { numerator: 0, denominator: 1 },
            [
              createStaffEntry([
                createVoiceEntry([
                  createNote(60, { numerator: 1, denominator: 4 }),
                ]),
              ]),
            ],
            { numerator: 0, denominator: 1 },
          ),
          createVerticalContainer(
            { numerator: 1, denominator: 4 },
            [
              createStaffEntry([
                createVoiceEntry([
                  createNote(62, { numerator: 1, denominator: 4 }),
                ]),
              ]),
            ],
            { numerator: 0, denominator: 1 },
          ),
        ],
        60, // 60 BPM = 1 beat per second
      ),
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
      createMeasure(
        { numerator: 0, denominator: 1 },
        [
          createVerticalContainer(
            { numerator: 0, denominator: 1 },
            [
              createStaffEntry([
                createVoiceEntry(
                  [createNote(60, { numerator: 1, denominator: 16 })],
                  true,
                ),
                createVoiceEntry([
                  createNote(62, { numerator: 1, denominator: 4 }),
                ]),
              ]),
            ],
            { numerator: 0, denominator: 1 },
          ),
        ],
        120,
      ),
    ])

    const notes = extractNoteSequence(sheet)
    expect(notes).toHaveLength(1)
    expect(notes[0].pitch).toBe(62)
  })

  it('startTime 순으로 정렬된다', () => {
    const sheet = createMockSheet([
      createMeasure(
        { numerator: 0, denominator: 1 },
        [
          createVerticalContainer(
            { numerator: 1, denominator: 4 },
            [
              createStaffEntry([
                createVoiceEntry([
                  createNote(62, { numerator: 1, denominator: 4 }),
                ]),
              ]),
            ],
            { numerator: 0, denominator: 1 },
          ),
          createVerticalContainer(
            { numerator: 0, denominator: 1 },
            [
              createStaffEntry([
                createVoiceEntry([
                  createNote(60, { numerator: 1, denominator: 4 }),
                ]),
              ]),
            ],
            { numerator: 0, denominator: 1 },
          ),
        ],
        120,
      ),
    ])

    const notes = extractNoteSequence(sheet)
    expect(notes).toHaveLength(2)
    expect(notes[0].pitch).toBe(60)
    expect(notes[1].pitch).toBe(62)
  })
})
