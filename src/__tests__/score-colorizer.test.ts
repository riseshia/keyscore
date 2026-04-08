import { describe, it, expect, vi } from 'vitest'
import { ScoreColorTracker } from '../lib/score-colorizer'

function createMockOsmd() {
  const setColor = vi.fn()
  const graphicalNote = { setColor }
  const osmd = {
    rules: {
      GNote: vi.fn(() => graphicalNote),
    },
  }
  return { osmd, graphicalNote, setColor }
}

describe('ScoreColorTracker', () => {
  describe('color assignment', () => {
    it('colors miss as red (#cc0000)', () => {
      const { osmd, setColor } = createMockOsmd()
      const tracker = new ScoreColorTracker()
      const note = {}

      tracker.colorize(osmd, note, 'miss')

      expect(setColor).toHaveBeenCalledWith('#cc0000', expect.any(Object))
    })

    it('colors error as gray (#999999), distinct from miss', () => {
      const { osmd, setColor } = createMockOsmd()
      const tracker = new ScoreColorTracker()
      const note = {}

      tracker.colorize(osmd, note, 'error')

      expect(setColor).toHaveBeenCalledWith('#999999', expect.any(Object))
    })

    it('miss and error use different colors', () => {
      const { osmd, setColor } = createMockOsmd()
      const tracker = new ScoreColorTracker()
      const missNote = {}
      const errorNote = {}

      tracker.colorize(osmd, missNote, 'miss')
      tracker.colorize(osmd, errorNote, 'error')

      const missColor = setColor.mock.calls[0][0]
      const errorColor = setColor.mock.calls[1][0]
      expect(missColor).not.toBe(errorColor)
    })
  })
})
