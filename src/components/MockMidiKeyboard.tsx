import { useEffect, useRef } from 'react'
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

interface MockMidiKeyboardProps {
  onNoteEvent: (event: MidiNoteEvent) => void
}

export function MockMidiKeyboard({ onNoteEvent }: MockMidiKeyboardProps) {
  const pressedKeysRef = useRef<Set<string>>(new Set())

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

  return (
    <div className={styles.container}>
      <div className={styles.label}>모의 MIDI 키보드 (키보드 입력 활성)</div>
      <div className={styles.keyHint}>
        <span>C4~B4: A S D F G H J (검은건반: W E T Y U)</span>
        <span>C5~F5: K L ; ' (검은건반: O P)</span>
      </div>
    </div>
  )
}
