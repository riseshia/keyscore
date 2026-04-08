import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import FolderPicker from './components/FolderPicker'
import SheetMusic from './components/SheetMusic'
import type { SheetMusicHandle } from './components/SheetMusic'
import { MidiDeviceSelector } from './components/MidiDeviceSelector'
import { MockMidiKeyboard } from './components/MockMidiKeyboard'
import { useMidi } from './hooks/useMidi'
import { useSession } from './hooks/useSession'
import type { SectionRange } from './hooks/useSession'
import type { GradeResult } from './lib/grader'
import type { MidiNoteEvent, SongNote } from './lib/types'
import styles from './App.module.css'

/** songNotes에서 유니크한 startTime 목록 (beat 단위) */
function getBeatTimes(notes: SongNote[]): number[] {
  const times: number[] = []
  for (const note of notes) {
    if (times.length === 0 || times[times.length - 1] !== note.startTime) {
      times.push(note.startTime)
    }
  }
  return times
}

const SPEED_MIN = 0.1
const SPEED_MAX = 1.0
const SPEED_STEP = 0.1

function clampSpeed(v: number): number {
  return Math.round(Math.max(SPEED_MIN, Math.min(SPEED_MAX, v)) * 10) / 10
}

function App() {
  const [musicXml, setMusicXml] = useState<string | null>(null)
  const [songNotes, setSongNotes] = useState<SongNote[]>([])
  const [lastNote, setLastNote] = useState<MidiNoteEvent | null>(null)
  const [startBeat, setStartBeat] = useState<number | null>(null)
  const [endBeat, setEndBeat] = useState<number | null>(null)
  const [speedModifier, setSpeedModifier] = useState(1.0)
  const sheetMusicRef = useRef<SheetMusicHandle>(null)

  const beatTimes = useMemo(() => getBeatTimes(songNotes), [songNotes])

  const range: SectionRange = useMemo(() => ({
    startTime: startBeat !== null ? beatTimes[startBeat] : (beatTimes[0] ?? 0),
    endTime: endBeat !== null ? beatTimes[endBeat] : (beatTimes[beatTimes.length - 1] ?? 0),
  }), [startBeat, endBeat, beatTimes])

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
    range,
    speedModifier,
    onCursorAdvance: handleCursorAdvance,
    onGradeResult: handleGradeResult,
  })

  const handleBeatClick = useCallback((beatIndex: number) => {
    if (state !== 'idle') return // 연주 중에는 무시
    sheetMusicRef.current?.cursorSetTo(beatIndex)
  }, [state])

  // 자동 반복: finished → 커서 복귀 + idle (색상 유지)
  useEffect(() => {
    if (state === 'finished') {
      if (startBeat !== null) {
        sheetMusicRef.current?.cursorSetTo(startBeat)
      } else {
        sheetMusicRef.current?.cursorReset()
      }
      stopSession()
    }
  }, [state, startBeat, stopSession])

  const handleMidiEvent = useCallback(
    (event: MidiNoteEvent) => {
      setLastNote(event)
      // idle 상태에서 키 입력 시 이전 세션의 색상 리셋
      if (state === 'idle' && songNotes.length > 0) {
        sheetMusicRef.current?.resetColors()
      }
      sessionHandleNote(event)
    },
    [sessionHandleNote, state, songNotes.length],
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
    setStartBeat(null)
    setEndBeat(null)
  }, [])

  const handleRestart = useCallback(() => {
    sheetMusicRef.current?.resetColors()
    if (startBeat !== null) {
      sheetMusicRef.current?.cursorSetTo(startBeat)
    } else {
      sheetMusicRef.current?.cursorReset()
      sheetMusicRef.current?.scrollToTop()
    }
    stopSession()
  }, [stopSession, startBeat])

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
            {state === 'idle' && songNotes.length > 0 && (
              <>
                <span className={styles.separator}>|</span>
                <button
                  onClick={() => {
                    const beat = sheetMusicRef.current?.getBeatIndex() ?? 0
                    setStartBeat(beat)
                    if (endBeat !== null && beat > endBeat) setEndBeat(null)
                  }}
                  className={styles.controlButton}
                >
                  시작점
                </button>
                <button
                  onClick={() => {
                    const beat = sheetMusicRef.current?.getBeatIndex() ?? 0
                    setEndBeat(beat)
                    if (startBeat !== null && beat < startBeat)
                      setStartBeat(null)
                  }}
                  className={styles.controlButton}
                >
                  끝점
                </button>
                {(startBeat !== null || endBeat !== null) && (
                  <button
                    onClick={() => {
                      setStartBeat(null)
                      setEndBeat(null)
                    }}
                    className={styles.controlButton}
                  >
                    구간 해제
                  </button>
                )}
              </>
            )}
            {state !== 'idle' && (
              <>
                <span className={styles.separator}>|</span>
                <button onClick={stopSession} className={styles.controlButton}>
                  중지
                </button>
              </>
            )}
            {songNotes.length > 0 && (
              <button onClick={handleRestart} className={styles.controlButton}>
                리셋
              </button>
            )}
            <span className={styles.separator} />
            <span className={styles.speedLabel}>배속:</span>
            <button
              onClick={() => setSpeedModifier((v) => clampSpeed(v - SPEED_STEP))}
              className={styles.controlButton}
              disabled={state === 'playing' || speedModifier <= SPEED_MIN}
            >
              −
            </button>
            <span className={styles.speedValue}>{speedModifier.toFixed(1)}x</span>
            <button
              onClick={() => setSpeedModifier((v) => clampSpeed(v + SPEED_STEP))}
              className={styles.controlButton}
              disabled={state === 'playing' || speedModifier >= SPEED_MAX}
            >
              +
            </button>
          </div>
          {(startBeat !== null || endBeat !== null) && (
            <div className={styles.rangeInfo}>
              구간: {startBeat !== null ? `beat ${startBeat}` : '처음'}
              {' ~ '}
              {endBeat !== null ? `beat ${endBeat}` : '끝'}
            </div>
          )}
          {songNotes.length > 0 && (
            <div className={styles.sessionInfo}>
              <span className={styles.sessionState}>
                {state === 'idle' && '대기 (아무 키나 누르면 시작)'}
                {state === 'playing' && '연습 중...'}
              </span>
              <div className={styles.stats}>
                <span className={styles.statPerfect}>
                  Perfect: {stats.perfect}
                </span>
                <span className={styles.statGood}>Good: {stats.good}</span>
                <span className={styles.statMiss}>Miss: {stats.miss}</span>
                <span className={styles.statError}>Error: {stats.error}</span>
                {sessionResult && (
                  <>
                    <span className={styles.separator}>|</span>
                    <span>
                      정확도: {Math.round(sessionResult.stats.accuracy * 100)}%
                    </span>
                    {Math.abs(sessionResult.drift) >= 10 && (
                      <span className={styles.drift}>
                        {sessionResult.drift > 0
                          ? `+${Math.round(sessionResult.drift)}ms 늦음`
                          : `${Math.round(sessionResult.drift)}ms 빠름`}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          <SheetMusic
            ref={sheetMusicRef}
            musicXml={musicXml}
            onNotesReady={setSongNotes}
            onBeatClick={handleBeatClick}
          />
        </>
      )}
    </div>
  )
}

export default App
