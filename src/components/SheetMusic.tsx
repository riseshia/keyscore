import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import { extractNoteSequenceWithRefs } from '../lib/note-sequence'
import { ScoreColorTracker } from '../lib/score-colorizer'
import type { Grade } from '../lib/grader'
import type { SongNote } from '../lib/types'
import styles from './SheetMusic.module.css'

interface SheetMusicProps {
  musicXml: string
  onNotesReady?: (notes: SongNote[]) => void
  onBeatClick?: (beatIndex: number) => void
}

/** beat 위치 정보 (X 좌표 + Y 좌표로 클릭 매칭) */
interface BeatPosition {
  beatIndex: number
  x: number // container 기준 X
  y: number // container 기준 Y (줄 구분용)
}

export interface SheetMusicHandle {
  cursorNext: () => void
  cursorPrevious: () => void
  cursorReset: () => void
  cursorSetTo: (beatIndex: number) => void
  getBeatIndex: () => number
  colorNote: (noteIndex: number, grade: Grade) => void
  resetColors: () => void
  scrollToTop: () => void
}

export default forwardRef<SheetMusicHandle, SheetMusicProps>(
  function SheetMusic({ musicXml, onNotesReady, onBeatClick }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const osmdRef = useRef<OpenSheetMusicDisplay | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const osmdNotesRef = useRef<any[]>([])
    const colorTrackerRef = useRef(new ScoreColorTracker())
    const beatIndexRef = useRef(0)
    const beatPositionsRef = useRef<BeatPosition[]>([])
    const onBeatClickRef = useRef(onBeatClick)
    onBeatClickRef.current = onBeatClick

    useImperativeHandle(ref, () => ({
      cursorNext: () => {
        const cursor = osmdRef.current?.cursor
        if (!cursor) return
        cursor.next()
        beatIndexRef.current++
      },
      cursorPrevious: () => {
        const cursor = osmdRef.current?.cursor
        if (!cursor) return
        cursor.previous()
        if (beatIndexRef.current > 0) beatIndexRef.current--
      },
      cursorReset: () => {
        const cursor = osmdRef.current?.cursor
        if (!cursor) return
        cursor.reset()
        cursor.show()
        beatIndexRef.current = 0
      },
      cursorSetTo: (beatIndex: number) => {
        const cursor = osmdRef.current?.cursor
        if (!cursor) return
        cursor.reset()
        for (let i = 0; i < beatIndex; i++) {
          cursor.next()
        }
        cursor.show()
        beatIndexRef.current = beatIndex
      },
      getBeatIndex: () => beatIndexRef.current,
      colorNote: (noteIndex: number, grade: Grade) => {
        const osmd = osmdRef.current
        const osmdNote = osmdNotesRef.current[noteIndex]
        if (!osmd || !osmdNote) return
        colorTrackerRef.current.colorize(osmd, osmdNote, grade)
      },
      resetColors: () => {
        const osmd = osmdRef.current
        if (!osmd) return
        colorTrackerRef.current.resetAll(osmd, osmdNotesRef.current)
      },
      scrollToTop: () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      },
    }))

    useEffect(() => {
      if (!containerRef.current) return

      const osmd = new OpenSheetMusicDisplay(containerRef.current, {
        autoResize: true,
        backend: 'svg',
        followCursor: true,
      })
      osmdRef.current = osmd
      colorTrackerRef.current = new ScoreColorTracker()

      osmd.load(musicXml).then(() => {
        osmd.render()
        osmd.cursor.show()
        if (osmd.Sheet) {
          const result = extractNoteSequenceWithRefs(osmd.Sheet)
          osmdNotesRef.current = result.osmdNotes
          if (onNotesReady) {
            onNotesReady(result.notes)
          }
        }

        // beat 위치 맵 구축: 커서를 처음부터 끝까지 이동하며 좌표 기록
        buildBeatPositionMap(osmd, containerRef.current!)
      })

      // 클릭 이벤트 핸들러
      const container = containerRef.current
      const handleClick = (e: MouseEvent) => {
        if (!onBeatClickRef.current) return
        const positions = beatPositionsRef.current
        if (positions.length === 0) return

        const rect = container!.getBoundingClientRect()
        const clickX = e.clientX - rect.left
        const clickY = e.clientY - rect.top

        // 가장 가까운 beat 찾기 (Y 우선 → X 보조)
        let bestIndex = 0
        let bestDist = Infinity
        for (const pos of positions) {
          const dy = Math.abs(pos.y - clickY)
          // Y 거리가 40px 이내인 같은 줄의 beat만 고려
          if (dy > 40) continue
          const dx = Math.abs(pos.x - clickX)
          if (dx < bestDist) {
            bestDist = dx
            bestIndex = pos.beatIndex
          }
        }
        // Y 40px 이내 매칭이 없으면 순수 거리로 fallback
        if (bestDist === Infinity) {
          for (const pos of positions) {
            const dist = Math.hypot(pos.x - clickX, pos.y - clickY)
            if (dist < bestDist) {
              bestDist = dist
              bestIndex = pos.beatIndex
            }
          }
        }

        onBeatClickRef.current(bestIndex)
      }
      container.addEventListener('click', handleClick)

      return () => {
        container.removeEventListener('click', handleClick)
        osmd.clear()
        osmdRef.current = null
        osmdNotesRef.current = []
        beatPositionsRef.current = []
      }
    }, [musicXml])

    function buildBeatPositionMap(osmd: OpenSheetMusicDisplay, container: HTMLElement) {
      const positions: BeatPosition[] = []
      const cursor = osmd.cursor
      if (!cursor) return

      const containerRect = container.getBoundingClientRect()
      const savedBeat = beatIndexRef.current

      cursor.reset()
      let beatIndex = 0
      while (!cursor.Iterator.EndReached) {
        const el = cursor.cursorElement
        if (el) {
          const elRect = el.getBoundingClientRect()
          positions.push({
            beatIndex,
            x: elRect.left - containerRect.left + elRect.width / 2,
            y: elRect.top - containerRect.top + elRect.height / 2,
          })
        }
        cursor.next()
        beatIndex++
      }

      // 커서 원래 위치로 복원
      cursor.reset()
      for (let i = 0; i < savedBeat; i++) {
        cursor.next()
      }
      cursor.show()
      beatIndexRef.current = savedBeat

      beatPositionsRef.current = positions
    }

    return <div ref={containerRef} className={styles.container} />
  },
)
