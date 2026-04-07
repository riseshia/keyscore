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

  describe('배속 조절 (speedModifier)', () => {
    it('0.5x에서 타이밍 윈도우가 2배로 확장된다', () => {
      // 1.0x에서 100ms 차이면 Good. 0.5x에서 100ms 차이면 Perfect (윈도우 2배).
      const grader = new Grader([note(60, 1000)], { speedModifier: 0.5 })

      const result = grader.processNoteOn(60, 1100)
      expect(result).not.toBeNull()
      expect(result!.grade).toBe('perfect') // 100ms / 0.5 = Perfect 범위 (50/0.5=100ms)
    })

    it('0.5x에서 GOOD 범위도 확장된다', () => {
      // 1.0x에서 400ms면 Error. 0.5x에서 400ms면 Good (GOOD_RANGE=300/0.5=600ms).
      const grader = new Grader([note(60, 1000)], { speedModifier: 0.5 })

      const result = grader.processNoteOn(60, 1400)
      expect(result).not.toBeNull()
      expect(result!.grade).toBe('good')
    })

    it('0.5x에서 확장된 GOOD 범위를 초과하면 매칭하지 않는다', () => {
      // GOOD_RANGE/0.5 = 600ms. 700ms 차이면 매칭 안 됨.
      const grader = new Grader([note(60, 1000)], { speedModifier: 0.5 })

      const result = grader.processNoteOn(60, 1700)
      expect(result).toBeNull()
    })

    it('0.5x에서 flush Miss 판정도 확장된 윈도우를 사용한다', () => {
      const grader = new Grader([note(60, 1000)], { speedModifier: 0.5 })

      // 1.0x라면 1400ms에 miss. 0.5x라면 GOOD_RANGE/0.5=600ms이므로 1400ms는 아직 안전.
      const missesEarly = grader.flush(1400)
      expect(missesEarly).toHaveLength(0)

      // 1000 + 600 + 100 = 1700ms에서 miss
      const missesLate = grader.flush(1700)
      expect(missesLate).toHaveLength(1)
      expect(missesLate[0].grade).toBe('miss')
    })

    it('speedModifier 미지정 시 기본값 1.0으로 동작한다', () => {
      const grader = new Grader([note(60, 1000)])

      const result = grader.processNoteOn(60, 1100)
      expect(result!.grade).toBe('good') // 기존과 동일
    })
  })

  describe('적응형 오프셋', () => {
    it('점점 밀리는 연주에서 연쇄 Miss를 방지한다', () => {
      const grader = new Grader([
        note(60, 1000),
        note(62, 1500),
        note(64, 2000),
        note(65, 2500),
        note(67, 3000),
      ])

      // 100ms씩 점점 밀리는 연주
      const r1 = grader.processNoteOn(60, 1100) // +100ms
      const r2 = grader.processNoteOn(62, 1620) // +120ms
      const r3 = grader.processNoteOn(64, 2150) // +150ms
      const r4 = grader.processNoteOn(65, 2700) // +200ms
      const r5 = grader.processNoteOn(67, 3260) // +260ms

      // 오프셋 보정 덕분에 전부 매칭되어야 함 (null이면 안 됨)
      expect(r1).not.toBeNull()
      expect(r2).not.toBeNull()
      expect(r3).not.toBeNull()
      expect(r4).not.toBeNull()
      expect(r5).not.toBeNull()
    })

    it('점점 빨라지는 연주에도 보정이 동작한다', () => {
      const grader = new Grader([
        note(60, 1000),
        note(62, 1500),
        note(64, 2000),
        note(65, 2500),
      ])

      const r1 = grader.processNoteOn(60, 900)  // -100ms
      const r2 = grader.processNoteOn(62, 1380) // -120ms
      const r3 = grader.processNoteOn(64, 1850) // -150ms
      const r4 = grader.processNoteOn(65, 2300) // -200ms

      expect(r1).not.toBeNull()
      expect(r2).not.toBeNull()
      expect(r3).not.toBeNull()
      expect(r4).not.toBeNull()
    })

    it('오프셋이 정박으로 돌아오면 0으로 수렴한다', () => {
      const grader = new Grader([
        note(60, 1000),
        note(62, 1500),
        note(64, 2000),
        note(65, 2500),
        note(67, 3000),
      ])

      // 처음 밀리다가
      grader.processNoteOn(60, 1200) // +200ms
      grader.processNoteOn(62, 1700) // +200ms

      // 정박으로 돌아옴
      grader.processNoteOn(64, 2000) // 정확
      grader.processNoteOn(65, 2500) // 정확
      const r5 = grader.processNoteOn(67, 3000) // 정확

      // 정박 복귀 후 perfect 판정
      expect(r5!.grade).toBe('perfect')
    })

    it('getOffset으로 현재 오프셋을 조회할 수 있다', () => {
      const grader = new Grader([
        note(60, 1000),
        note(62, 1500),
      ])

      expect(grader.getOffset()).toBe(0) // 초기값

      grader.processNoteOn(60, 1100) // +100ms
      expect(grader.getOffset()).toBeGreaterThan(0)

      grader.processNoteOn(62, 1600) // +100ms
      expect(grader.getOffset()).toBeGreaterThan(0)
    })

    it('flush의 Miss 판정에도 오프셋이 반영된다', () => {
      const grader = new Grader([
        note(60, 1000),
        note(62, 1500),
        note(64, 2000),
      ])

      // 200ms 밀려서 연주 → offset 학습
      grader.processNoteOn(60, 1200) // +200ms
      grader.processNoteOn(62, 1700) // +200ms

      // note(64, 2000)을 안 침.
      // 보정 없으면 2300ms에 miss. 보정 있으면 offset만큼 더 기다려야 함.
      const offset = grader.getOffset()
      const missesEarly = grader.flush(2000 + 300 + offset * 0.5)
      expect(missesEarly).toHaveLength(0) // 아직 miss 아님

      const missesLate = grader.flush(2000 + 300 + offset + 100)
      expect(missesLate).toHaveLength(1) // 이제 miss
    })
  })
})
