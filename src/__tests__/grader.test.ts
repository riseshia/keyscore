import { describe, expect, it } from 'vitest'
import { Grader } from '../lib/grader'
import type { SongNote } from '../lib/types'

function note(pitch: number, startTime: number, duration = 500): SongNote {
  return { pitch, startTime, duration }
}

describe('Grader', () => {
  it('정확한 타이밍에 치면 Perfect', () => {
    const grader = new Grader([note(60, 1000)])

    const result = grader.processNoteOn(60, 1000)
    expect(result).not.toBeNull()
    expect(result!.grade).toBe('perfect')
    expect(result!.songNote.pitch).toBe(60)
    expect(result!.noteIndex).toBe(0)
  })

  it('50ms 이내면 Perfect', () => {
    const grader = new Grader([note(60, 1000)])

    const result = grader.processNoteOn(60, 1050)
    expect(result!.grade).toBe('perfect')
  })

  it('50ms 초과 300ms 이내면 Good', () => {
    const grader = new Grader([note(60, 1000)])

    const result = grader.processNoteOn(60, 1100)
    expect(result!.grade).toBe('good')
  })

  it('300ms 초과면 매칭하지 않는다 (Error)', () => {
    const grader = new Grader([note(60, 1000)])

    const result = grader.processNoteOn(60, 1500)
    expect(result).toBeNull()
  })

  it('피치가 다르면 매칭하지 않는다', () => {
    const grader = new Grader([note(60, 1000)])

    const result = grader.processNoteOn(62, 1000)
    expect(result).toBeNull()
  })

  it('일찍 친 경우에도 300ms 이내면 매칭', () => {
    const grader = new Grader([note(60, 1000)])

    const result = grader.processNoteOn(60, 800)
    expect(result!.grade).toBe('good')
  })

  it('일찍 50ms 이내면 Perfect', () => {
    const grader = new Grader([note(60, 1000)])

    const result = grader.processNoteOn(60, 960)
    expect(result!.grade).toBe('perfect')
  })

  it('이미 매칭된 음표는 다시 매칭하지 않는다', () => {
    const grader = new Grader([note(60, 1000)])

    const first = grader.processNoteOn(60, 1000)
    expect(first).not.toBeNull()

    const second = grader.processNoteOn(60, 1020)
    expect(second).toBeNull()
  })

  it('연속된 같은 피치의 음표를 순서대로 매칭한다', () => {
    const grader = new Grader([note(60, 1000), note(60, 2000)])

    const first = grader.processNoteOn(60, 1000)
    expect(first!.songNote.startTime).toBe(1000)
    expect(first!.noteIndex).toBe(0)

    const second = grader.processNoteOn(60, 2000)
    expect(second!.songNote.startTime).toBe(2000)
    expect(second!.noteIndex).toBe(1)
  })

  it('flush로 지나간 매칭 안 된 음표를 Miss로 확정한다', () => {
    const grader = new Grader([note(60, 1000), note(62, 2000)])

    // 1000ms의 음표를 치지 않고 시간이 지남
    const misses = grader.flush(1400) // 1000 + 300 + 100
    expect(misses).toHaveLength(1)
    expect(misses[0].grade).toBe('miss')
    expect(misses[0].songNote.pitch).toBe(60)
    expect(misses[0].noteIndex).toBe(0)
  })

  it('flush로 아직 윈도우 안인 음표는 Miss로 확정하지 않는다', () => {
    const grader = new Grader([note(60, 1000)])

    const misses = grader.flush(1200) // 아직 300ms 안
    expect(misses).toHaveLength(0)
  })

  it('다양한 피치를 동시에 처리한다', () => {
    const grader = new Grader([
      note(60, 1000),
      note(64, 1000),
      note(67, 1000),
    ])

    const r1 = grader.processNoteOn(60, 1010)
    const r2 = grader.processNoteOn(64, 1020)
    const r3 = grader.processNoteOn(67, 1030)

    expect(r1!.grade).toBe('perfect')
    expect(r2!.grade).toBe('perfect')
    expect(r3!.grade).toBe('perfect')
  })
})
