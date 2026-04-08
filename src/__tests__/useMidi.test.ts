import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMidi } from '../hooks/useMidi'

// Mock Web MIDI API
function createMockMidiAccess(inputDevices: Array<{ id: string; name: string }>) {
  const inputs = new Map<string, { id: string; name: string; onmidimessage: null | ((e: unknown) => void) }>()
  for (const d of inputDevices) {
    inputs.set(d.id, { ...d, onmidimessage: null })
  }

  return {
    inputs,
    onstatechange: null as null | (() => void),
  }
}

describe('useMidi', () => {
  let mockMidiAccess: ReturnType<typeof createMockMidiAccess>

  beforeEach(() => {
    mockMidiAccess = createMockMidiAccess([])
    Object.defineProperty(navigator, 'requestMIDIAccess', {
      value: vi.fn(() => Promise.resolve(mockMidiAccess)),
      writable: true,
      configurable: true,
    })
  })

  describe('auto-connect', () => {
    it('auto-selects when exactly one device is available', async () => {
      mockMidiAccess = createMockMidiAccess([{ id: 'dev1', name: 'My Piano' }])
      ;(navigator.requestMIDIAccess as ReturnType<typeof vi.fn>).mockReturnValue(
        Promise.resolve(mockMidiAccess),
      )

      const { result } = renderHook(() => useMidi())

      // Wait for async initialization
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(result.current.devices).toHaveLength(1)
      expect(result.current.selectedDeviceId).toBe('dev1')
    })

    it('does not auto-select when multiple devices are available', async () => {
      mockMidiAccess = createMockMidiAccess([
        { id: 'dev1', name: 'Piano A' },
        { id: 'dev2', name: 'Piano B' },
      ])
      ;(navigator.requestMIDIAccess as ReturnType<typeof vi.fn>).mockReturnValue(
        Promise.resolve(mockMidiAccess),
      )

      const { result } = renderHook(() => useMidi())

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(result.current.devices).toHaveLength(2)
      expect(result.current.selectedDeviceId).toBeNull()
    })

    it('does not auto-select when no devices are available', async () => {
      mockMidiAccess = createMockMidiAccess([])
      ;(navigator.requestMIDIAccess as ReturnType<typeof vi.fn>).mockReturnValue(
        Promise.resolve(mockMidiAccess),
      )

      const { result } = renderHook(() => useMidi())

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(result.current.devices).toHaveLength(0)
      expect(result.current.selectedDeviceId).toBeNull()
    })
  })
})
