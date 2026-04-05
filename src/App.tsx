import { useCallback, useRef, useState } from 'react'
import FolderPicker from './components/FolderPicker'
import SheetMusic from './components/SheetMusic'
import type { SheetMusicHandle } from './components/SheetMusic'
import { MidiDeviceSelector } from './components/MidiDeviceSelector'
import { MockMidiKeyboard } from './components/MockMidiKeyboard'
import { useMidi } from './hooks/useMidi'
import type { MidiNoteEvent } from './lib/types'
import styles from './App.module.css'

function App() {
  const [musicXml, setMusicXml] = useState<string | null>(null)
  const [lastNote, setLastNote] = useState<MidiNoteEvent | null>(null)
  const sheetMusicRef = useRef<SheetMusicHandle>(null)

  const handleNoteEvent = useCallback((event: MidiNoteEvent) => {
    setLastNote(event)
  }, [])

  const { devices, selectedDeviceId, selectDevice, error, injectNoteEvent } =
    useMidi({
      onNoteEvent: handleNoteEvent,
    })

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Keyscore</h1>
      </header>
      <FolderPicker onLoad={setMusicXml} />
      <MidiDeviceSelector
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onSelect={selectDevice}
        error={error}
      />
      <MockMidiKeyboard onNoteEvent={injectNoteEvent} />
      {lastNote && (
        <div className={styles.midiStatus}>
          마지막 입력: {lastNote.type === 'noteOn' ? 'ON' : 'OFF'}{' '}
          pitch={lastNote.pitch} velocity={lastNote.velocity}
        </div>
      )}
      {musicXml && (
        <>
          <div className={styles.controls}>
            <button
              onClick={() => sheetMusicRef.current?.cursorReset()}
              className={styles.controlButton}
            >
              처음
            </button>
            <button
              onClick={() => sheetMusicRef.current?.cursorPrevious()}
              className={styles.controlButton}
            >
              이전
            </button>
            <button
              onClick={() => sheetMusicRef.current?.cursorNext()}
              className={styles.controlButton}
            >
              다음
            </button>
          </div>
          <SheetMusic ref={sheetMusicRef} musicXml={musicXml} />
        </>
      )}
    </div>
  )
}

export default App
