import { useCallback, useEffect, useRef, useState } from 'react'
import { Grader, type GradeResult } from '../lib/grader'
import type { MidiNoteEvent, SongNote } from '../lib/types'

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
}

export function useSession({ songNotes, onGradeResult }: UseSessionOptions) {
  const [state, setState] = useState<SessionState>('idle')
  const [stats, setStats] = useState<SessionStats>({
    perfect: 0,
    good: 0,
    miss: 0,
    error: 0,
    total: 0,
  })
  const [elapsedMs, setElapsedMs] = useState(0)

  const graderRef = useRef<Grader | null>(null)
  const startTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const statsRef = useRef(stats)
  const onGradeResultRef = useRef(onGradeResult)
  const songNotesRef = useRef(songNotes)

  onGradeResultRef.current = onGradeResult
  songNotesRef.current = songNotes

  const updateStats = useCallback(
    (grade: GradeResult['grade']) => {
      setStats((prev) => {
        const next = { ...prev, [grade]: prev[grade] + 1, total: prev.total + 1 }
        statsRef.current = next
        return next
      })
    },
    [],
  )

  const startSession = useCallback(() => {
    graderRef.current = new Grader(songNotesRef.current)
    startTimeRef.current = performance.now()
    setState('playing')
    setStats({ perfect: 0, good: 0, miss: 0, error: 0, total: 0 })
    setElapsedMs(0)

    // Game loop: 50ms 간격으로 flush + 시간 갱신
    timerRef.current = setInterval(() => {
      const now = performance.now()
      const elapsed = now - startTimeRef.current
      setElapsedMs(elapsed)

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
        onGradeResultRef.current?.(miss)
      }

      // 모든 음표가 지나갔으면 종료
      const lastNote = songNotesRef.current[songNotesRef.current.length - 1]
      if (lastNote && elapsed > lastNote.startTime + lastNote.duration + 500) {
        // 마지막 음표 + duration + 여유 500ms
        setState('finished')
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
    }, 50)
  }, [])

  const stopSession = useCallback(() => {
    setState('idle')
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    graderRef.current = null
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
        onGradeResultRef.current?.(result)
      } else {
        // 매칭 안 됨 → Error
        updateStats('error')
      }
    },
    [startSession, updateStats],
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
    handleNoteEvent,
    startSession,
    stopSession,
  }
}
