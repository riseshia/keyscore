import { useCallback, useRef, useState } from 'react'
import FolderPicker from './components/FolderPicker'
import SheetMusic from './components/SheetMusic'
import type { SheetMusicHandle } from './components/SheetMusic'
import { MidiDeviceSelector } from './components/MidiDeviceSelector'
import { MockMidiKeyboard } from './components/MockMidiKeyboard'
import { useMidi } from './hooks/useMidi'
import { useSession } from './hooks/useSession'
import type { GradeResult } from './lib/grader'
import type { MidiNoteEvent, SongNote } from './lib/types'
import styles from './App.module.css'

function App() {
  const [musicXml, setMusicXml] = useState<string | null>(null)
  const [songNotes, setSongNotes] = useState<SongNote[]>([])
  const [lastNote, setLastNote] = useState<MidiNoteEvent | null>(null)
  const sheetMusicRef = useRef<SheetMusicHandle>(null)

  const handleCursorAdvance = useCallback(() => {
    sheetMusicRef.current?.cursorNext()
  }, [])

  const handleGradeResult = useCallback((result: GradeResult) => {
    sheetMusicRef.current?.colorNote(result.noteIndex, result.grade)
  }, [])

  const {
    state,
    stats,
    sessionResult,
    handleNoteEvent: sessionHandleNote,
    stopSession,
  } = useSession({
    songNotes,
    onCursorAdvance: handleCursorAdvance,
    onGradeResult: handleGradeResult,
  })

  const handleMidiEvent = useCallback(
    (event: MidiNoteEvent) => {
      setLastNote(event)
      sessionHandleNote(event)
    },
    [sessionHandleNote],
  )

  const { devices, selectedDeviceId, selectDevice, error, injectNoteEvent } =
    useMidi({
      onNoteEvent: handleMidiEvent,
    })

  const handleMockNote = useCallback(
    (event: MidiNoteEvent) => {
      injectNoteEvent(event)
    },
    [injectNoteEvent],
  )

  const handleLoadXml = useCallback((xml: string) => {
    setMusicXml(xml)
    setSongNotes([])
    setLastNote(null)
  }, [])

  const handleRestart = useCallback(() => {
    sheetMusicRef.current?.resetColors()
    sheetMusicRef.current?.cursorReset()
    sheetMusicRef.current?.scrollToTop()
    stopSession()
  }, [stopSession])

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Keyscore</h1>
      </header>
      <FolderPicker onLoad={handleLoadXml} />
      <MidiDeviceSelector
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onSelect={selectDevice}
        error={error}
      />
      <MockMidiKeyboard onNoteEvent={handleMockNote} />
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
              onClick={() => {
                sheetMusicRef.current?.cursorReset()
                sheetMusicRef.current?.scrollToTop()
              }}
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
            {state !== 'idle' && (
              <button onClick={stopSession} className={styles.controlButton}>
                중지
              </button>
            )}
          </div>
          {songNotes.length > 0 && (
            <div className={styles.sessionInfo}>
              <span className={styles.sessionState}>
                {state === 'idle' && '대기 (아무 키나 누르면 시작)'}
                {state === 'playing' && '연습 중...'}
                {state === 'finished' && '완료!'}
              </span>
              <div className={styles.stats}>
                <span className={styles.statPerfect}>
                  Perfect: {stats.perfect}
                </span>
                <span className={styles.statGood}>Good: {stats.good}</span>
                <span className={styles.statMiss}>Miss: {stats.miss}</span>
                <span className={styles.statError}>Error: {stats.error}</span>
              </div>
              {state === 'finished' && sessionResult && (
                <div className={styles.resultSummary}>
                  <span>
                    정확도: {Math.round(sessionResult.stats.accuracy * 100)}%
                  </span>
                  <button
                    onClick={handleRestart}
                    className={styles.controlButton}
                  >
                    다시 연습
                  </button>
                </div>
              )}
            </div>
          )}
          <SheetMusic
            ref={sheetMusicRef}
            musicXml={musicXml}
            onNotesReady={setSongNotes}
          />
        </>
      )}
    </div>
  )
}

export default App
