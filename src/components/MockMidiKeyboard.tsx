import { useEffect, useRef, useCallback } from 'react'
import type { MidiNoteEvent } from '../lib/types'
import styles from './MockMidiKeyboard.module.css'

// 컴퓨터 키보드 → MIDI 노트 매핑 (2옥타브)
// 하단 행: C4~B4 (흰건반 + 검은건반)
// 상단 행: C5~B5
const KEY_MAP: Record<string, number> = {
  // C4~B4 (하단)
  a: 60, // C4
  w: 61, // C#4
  s: 62, // D4
  e: 63, // D#4
  d: 64, // E4
  f: 65, // F4
  t: 66, // F#4
  g: 67, // G4
  y: 68, // G#4
  h: 69, // A4
  u: 70, // A#4
  j: 71, // B4
  // C5~B5 (상단)
  k: 72, // C5
  o: 73, // C#5
  l: 74, // D5
  p: 75, // D#5
  ';': 76, // E5
  "'": 77, // F5
}

// 화면 키보드 레이아웃
const WHITE_KEYS = [
  { pitch: 60, label: 'C4', key: 'A' },
  { pitch: 62, label: 'D4', key: 'S' },
  { pitch: 64, label: 'E4', key: 'D' },
  { pitch: 65, label: 'F4', key: 'F' },
  { pitch: 67, label: 'G4', key: 'G' },
  { pitch: 69, label: 'A4', key: 'H' },
  { pitch: 71, label: 'B4', key: 'J' },
  { pitch: 72, label: 'C5', key: 'K' },
  { pitch: 74, label: 'D5', key: 'L' },
  { pitch: 76, label: 'E5', key: ';' },
  { pitch: 77, label: 'F5', key: "'" },
]

const BLACK_KEYS = [
  { pitch: 61, label: 'C#', key: 'W', position: 0 },
  { pitch: 63, label: 'D#', key: 'E', position: 1 },
  // E#는 없으므로 position 2 건너뜀
  { pitch: 66, label: 'F#', key: 'T', position: 3 },
  { pitch: 68, label: 'G#', key: 'Y', position: 4 },
  { pitch: 70, label: 'A#', key: 'U', position: 5 },
  // B#는 없으므로 position 6 건너뜀
  { pitch: 73, label: 'C#5', key: 'O', position: 7 },
  { pitch: 75, label: 'D#5', key: 'P', position: 8 },
]

interface MockMidiKeyboardProps {
  onNoteEvent: (event: MidiNoteEvent) => void
}

export function MockMidiKeyboard({ onNoteEvent }: MockMidiKeyboardProps) {
  const pressedKeysRef = useRef<Set<string>>(new Set())
  // 터치 중인 pitch를 touch identifier별로 추적
  const activeTouchesRef = useRef<Map<number, number>>(new Map())

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const key = e.key.toLowerCase()
      const pitch = KEY_MAP[key]
      if (pitch === undefined) return
      if (pressedKeysRef.current.has(key)) return

      pressedKeysRef.current.add(key)
      onNoteEvent({
        type: 'noteOn',
        pitch,
        velocity: 80,
        timestamp: performance.now(),
      })
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const pitch = KEY_MAP[key]
      if (pitch === undefined) return

      pressedKeysRef.current.delete(key)
      onNoteEvent({
        type: 'noteOff',
        pitch,
        velocity: 0,
        timestamp: performance.now(),
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [onNoteEvent])

  const handleTouchStart = useCallback(
    (pitch: number, e: React.TouchEvent) => {
      e.preventDefault()
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        activeTouchesRef.current.set(touch.identifier, pitch)
      }
      onNoteEvent({
        type: 'noteOn',
        pitch,
        velocity: 80,
        timestamp: performance.now(),
      })
    },
    [onNoteEvent],
  )

  const handleTouchEnd = useCallback(
    (pitch: number, e: React.TouchEvent) => {
      e.preventDefault()
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        const activePitch = activeTouchesRef.current.get(touch.identifier)
        activeTouchesRef.current.delete(touch.identifier)
        if (activePitch !== undefined) {
          onNoteEvent({
            type: 'noteOff',
            pitch: activePitch,
            velocity: 0,
            timestamp: performance.now(),
          })
        }
      }
    },
    [onNoteEvent],
  )

  return (
    <div className={styles.container}>
      <div className={styles.label}>모의 MIDI 키보드</div>
      <div className={styles.keyHint}>
        <span>C4~B4: A S D F G H J (검은건반: W E T Y U)</span>
        <span>C5~F5: K L ; ' (검은건반: O P)</span>
      </div>
      <div
        className={styles.keyboard}
        onTouchStart={(e) => e.preventDefault()}
      >
        <div className={styles.whiteKeys}>
          {WHITE_KEYS.map(({ pitch, label, key }) => (
            <button
              key={pitch}
              className={styles.whiteKey}
              onTouchStart={(e) => handleTouchStart(pitch, e)}
              onTouchEnd={(e) => handleTouchEnd(pitch, e)}
              onTouchCancel={(e) => handleTouchEnd(pitch, e)}
              onMouseDown={() =>
                onNoteEvent({
                  type: 'noteOn',
                  pitch,
                  velocity: 80,
                  timestamp: performance.now(),
                })
              }
              onMouseUp={() =>
                onNoteEvent({
                  type: 'noteOff',
                  pitch,
                  velocity: 0,
                  timestamp: performance.now(),
                })
              }
              onMouseLeave={() =>
                onNoteEvent({
                  type: 'noteOff',
                  pitch,
                  velocity: 0,
                  timestamp: performance.now(),
                })
              }
            >
              <span className={styles.keyLabel}>{label}</span>
              <span className={styles.keyBinding}>{key}</span>
            </button>
          ))}
        </div>
        <div className={styles.blackKeys}>
          {BLACK_KEYS.map(({ pitch, label, key, position }) => (
            <button
              key={pitch}
              className={styles.blackKey}
              style={{ left: `calc(${position} * (100% / 11) + (100% / 22))` }}
              onTouchStart={(e) => handleTouchStart(pitch, e)}
              onTouchEnd={(e) => handleTouchEnd(pitch, e)}
              onTouchCancel={(e) => handleTouchEnd(pitch, e)}
              onMouseDown={() =>
                onNoteEvent({
                  type: 'noteOn',
                  pitch,
                  velocity: 80,
                  timestamp: performance.now(),
                })
              }
              onMouseUp={() =>
                onNoteEvent({
                  type: 'noteOff',
                  pitch,
                  velocity: 0,
                  timestamp: performance.now(),
                })
              }
              onMouseLeave={() =>
                onNoteEvent({
                  type: 'noteOff',
                  pitch,
                  velocity: 0,
                  timestamp: performance.now(),
                })
              }
            >
              <span className={styles.blackKeyLabel}>{label}</span>
              <span className={styles.blackKeyBinding}>{key}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
