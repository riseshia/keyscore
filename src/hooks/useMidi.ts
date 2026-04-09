import { useCallback, useEffect, useRef, useState } from 'react'
import type { MidiNoteEvent } from '../lib/types'

export interface MidiDevice {
  id: string
  name: string
}

interface UseMidiOptions {
  onNoteEvent?: (event: MidiNoteEvent) => void
}

export function useMidi(options: UseMidiOptions = {}) {
  const [devices, setDevices] = useState<MidiDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [supported, setSupported] = useState(true)
  const midiAccessRef = useRef<MIDIAccess | null>(null)
  const callbackRef = useRef(options.onNoteEvent)

  // 콜백을 항상 최신으로 유지
  callbackRef.current = options.onNoteEvent

  // MIDI 메시지 핸들러
  const handleMidiMessage = useCallback((event: MIDIMessageEvent) => {
    const data = event.data
    if (!data || data.length < 3) return

    const status = data[0] & 0xf0
    const pitch = data[1]
    const velocity = data[2]

    if (status === 0x90 && velocity > 0) {
      // Note On
      callbackRef.current?.({
        type: 'noteOn',
        pitch,
        velocity,
        timestamp: performance.now(),
      })
    } else if (status === 0x80 || (status === 0x90 && velocity === 0)) {
      // Note Off
      callbackRef.current?.({
        type: 'noteOff',
        pitch,
        velocity: 0,
        timestamp: performance.now(),
      })
    }
  }, [])

  // 디바이스 목록 갱신
  const refreshDevices = useCallback((midiAccess: MIDIAccess) => {
    const inputs: MidiDevice[] = []
    midiAccess.inputs.forEach((input) => {
      inputs.push({ id: input.id, name: input.name ?? input.id })
    })
    setDevices(inputs)
  }, [])

  // 디바이스 선택
  const selectDevice = useCallback(
    (deviceId: string | null) => {
      const midiAccess = midiAccessRef.current
      if (!midiAccess) return

      // 기존 리스너 해제
      midiAccess.inputs.forEach((input) => {
        input.onmidimessage = null
      })

      setSelectedDeviceId(deviceId)

      if (deviceId) {
        const input = midiAccess.inputs.get(deviceId)
        if (input) {
          input.onmidimessage = handleMidiMessage
        }
      }
    },
    [handleMidiMessage],
  )

  // 모의 MIDI 이벤트 주입 (dev 모드용)
  const injectNoteEvent = useCallback((event: MidiNoteEvent) => {
    callbackRef.current?.(event)
  }, [])

  // Web MIDI API 초기화
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.requestMIDIAccess) {
      setSupported(false)
      setError(
        '이 브라우저에서는 MIDI를 지원하지 않아요. 화면 키보드를 사용해주세요.',
      )
      return
    }

    navigator
      .requestMIDIAccess()
      .then((midiAccess) => {
        midiAccessRef.current = midiAccess
        refreshDevices(midiAccess)

        // 디바이스 연결/해제 감지
        midiAccess.onstatechange = () => {
          refreshDevices(midiAccess)
        }
      })
      .catch((err) => {
        setError(`MIDI 접근 실패: ${err.message}`)
      })

    return () => {
      const midiAccess = midiAccessRef.current
      if (midiAccess) {
        midiAccess.inputs.forEach((input) => {
          input.onmidimessage = null
        })
        midiAccess.onstatechange = null
      }
    }
  }, [refreshDevices])

  // 디바이스 1개일 때 자동 연결
  useEffect(() => {
    if (devices.length === 1 && selectedDeviceId === null) {
      selectDevice(devices[0].id)
    }
  }, [devices, selectedDeviceId, selectDevice])

  return {
    devices,
    selectedDeviceId,
    selectDevice,
    error,
    supported,
    injectNoteEvent,
  }
}
