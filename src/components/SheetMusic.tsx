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
}

export interface SheetMusicHandle {
  cursorNext: () => void
  cursorPrevious: () => void
  cursorReset: () => void
  colorNote: (noteIndex: number, grade: Grade) => void
  resetColors: () => void
  scrollToTop: () => void
}

export default forwardRef<SheetMusicHandle, SheetMusicProps>(
  function SheetMusic({ musicXml, onNotesReady }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const osmdRef = useRef<OpenSheetMusicDisplay | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const osmdNotesRef = useRef<any[]>([])
    const colorTrackerRef = useRef(new ScoreColorTracker())

    useImperativeHandle(ref, () => ({
      cursorNext: () => {
        const cursor = osmdRef.current?.cursor
        if (!cursor) return
        cursor.next()
      },
      cursorPrevious: () => {
        const cursor = osmdRef.current?.cursor
        if (!cursor) return
        cursor.previous()
      },
      cursorReset: () => {
        const cursor = osmdRef.current?.cursor
        if (!cursor) return
        cursor.reset()
        cursor.show()
      },
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
      })

      return () => {
        osmd.clear()
        osmdRef.current = null
        osmdNotesRef.current = []
      }
    }, [musicXml])

    return <div ref={containerRef} className={styles.container} />
  },
)
