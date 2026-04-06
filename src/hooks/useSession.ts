import { useCallback, useEffect, useRef, useState } from 'react'
import { Grader, type GradeResult } from '../lib/grader'
import type {
  GradeResultRecord,
  MidiNoteEvent,
  SessionResult,
  SongNote,
} from '../lib/types'

export type SessionState = 'idle' | 'playing' | 'finished'

export interface SessionStats {
  perfect: number
  good: number
  miss: number
  error: number
  total: number
}

interface UseSessionOptions {
  songNotes: SongNote[]
  onGradeResult?: (result: GradeResult) => void
  onCursorAdvance?: () => void
}

export function useSession({
  songNotes,
  onGradeResult,
  onCursorAdvance,
}: UseSessionOptions) {
  const [state, setState] = useState<SessionState>('idle')
  const [stats, setStats] = useState<SessionStats>({
    perfect: 0,
    good: 0,
    miss: 0,
    error: 0,
    total: 0,
  })
  const [elapsedMs, setElapsedMs] = useState(0)
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null)

  const graderRef = useRef<Grader | null>(null)
  const startTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const statsRef = useRef(stats)
  const onGradeResultRef = useRef(onGradeResult)
  const onCursorAdvanceRef = useRef(onCursorAdvance)
  const songNotesRef = useRef(songNotes)
  const cursorIndexRef = useRef(0)
  const recordsRef = useRef<GradeResultRecord[]>([])

  onGradeResultRef.current = onGradeResult
  onCursorAdvanceRef.current = onCursorAdvance
  songNotesRef.current = songNotes

  const addRecord = useCallback(
    (record: GradeResultRecord) => {
      recordsRef.current.push(record)
    },
    [],
  )

  const updateStats = useCallback(
    (grade: GradeResult['grade']) => {
      setStats((prev) => {
        const next = {
          ...prev,
          [grade]: prev[grade] + 1,
          total: prev.total + 1,
        }
        statsRef.current = next
        return next
      })
    },
    [],
  )

  const buildSessionResult = useCallback((): SessionResult => {
    const s = statsRef.current
    const total = s.total || 1 // 0 나누기 방지
    return {
      songNotes: songNotesRef.current,
      gradeResults: [...recordsRef.current],
      stats: {
        ...s,
        accuracy: (s.perfect + s.good) / total,
      },
      drift: graderRef.current?.getOffset() ?? 0,
    }
  }, [])

  const finishSession = useCallback(() => {
    setState('finished')
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setSessionResult(buildSessionResult())
  }, [buildSessionResult])

  const startSession = useCallback(() => {
    graderRef.current = new Grader(songNotesRef.current)
    startTimeRef.current = performance.now()
    cursorIndexRef.current = 0
    recordsRef.current = []
    setState('playing')
    setStats({ perfect: 0, good: 0, miss: 0, error: 0, total: 0 })
    setElapsedMs(0)
    setSessionResult(null)

    // Game loop: 50ms 간격으로 flush + 시간 갱신
    timerRef.current = setInterval(() => {
      const now = performance.now()
      const elapsed = now - startTimeRef.current
      setElapsedMs(elapsed)

      // 커서 이동: 경과 시간이 다음 음표의 startTime을 지나면 advance
      // 같은 startTime의 음표들(화음 등)은 하나의 beat이므로 cursor.next()는 한 번만
      const notes = songNotesRef.current
      while (cursorIndexRef.current < notes.length) {
        const nextNote = notes[cursorIndexRef.current]
        if (elapsed >= nextNote.startTime) {
          const currentStartTime = nextNote.startTime
          // 같은 startTime의 음표들을 모두 건너뜀
          while (
            cursorIndexRef.current < notes.length &&
            notes[cursorIndexRef.current].startTime === currentStartTime
          ) {
            cursorIndexRef.current++
          }
          onCursorAdvanceRef.current?.()
        } else {
          break
        }
      }

      const misses = graderRef.current?.flush(elapsed) ?? []
      for (const miss of misses) {
        setStats((prev) => {
          const next = {
            ...prev,
            miss: prev.miss + 1,
            total: prev.total + 1,
          }
          statsRef.current = next
          return next
        })
        addRecord({
          noteIndex: miss.noteIndex,
          grade: 'miss',
          pitch: miss.songNote.pitch,
          time: elapsed,
          timeDiff: miss.timeDiff,
        })
        onGradeResultRef.current?.(miss)
      }

      // 모든 음표가 지나갔으면 종료
      const lastNote = songNotesRef.current[songNotesRef.current.length - 1]
      if (lastNote && elapsed > lastNote.startTime + lastNote.duration + 500) {
        finishSession()
      }
    }, 50)
  }, [addRecord, finishSession])

  const stopSession = useCallback(() => {
    setState('idle')
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    graderRef.current = null
    setSessionResult(null)
  }, [])

  const handleNoteEvent = useCallback(
    (event: MidiNoteEvent) => {
      if (event.type !== 'noteOn') return

      // idle 상태에서 첫 음을 치면 자동 시작
      if (!graderRef.current) {
        startSession()
      }

      const elapsed = performance.now() - startTimeRef.current
      const result = graderRef.current?.processNoteOn(event.pitch, elapsed)

      if (result) {
        updateStats(result.grade)
        addRecord({
          noteIndex: result.noteIndex,
          grade: result.grade,
          pitch: event.pitch,
          time: elapsed,
          timeDiff: result.timeDiff,
        })
        onGradeResultRef.current?.(result)
      } else {
        // 매칭 안 됨 → Error
        updateStats('error')
        addRecord({
          noteIndex: -1,
          grade: 'error',
          pitch: event.pitch,
          time: elapsed,
          timeDiff: 0,
        })
      }
    },
    [startSession, updateStats, addRecord],
  )

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // songNotes 변경 시 세션 리셋
  useEffect(() => {
    stopSession()
  }, [songNotes, stopSession])

  return {
    state,
    stats,
    elapsedMs,
    sessionResult,
    handleNoteEvent,
    startSession,
    stopSession,
  }
}
