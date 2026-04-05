import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import { extractNoteSequence } from '../lib/note-sequence'
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
}

export default forwardRef<SheetMusicHandle, SheetMusicProps>(
  function SheetMusic({ musicXml, onNotesReady }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const osmdRef = useRef<OpenSheetMusicDisplay | null>(null)

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
    }))

    useEffect(() => {
      if (!containerRef.current) return

      const osmd = new OpenSheetMusicDisplay(containerRef.current, {
        autoResize: true,
        backend: 'svg',
        followCursor: true,
      })
      osmdRef.current = osmd

      osmd.load(musicXml).then(() => {
        osmd.render()
        osmd.cursor.show()
        if (onNotesReady && osmd.Sheet) {
          const notes = extractNoteSequence(osmd.Sheet)
          onNotesReady(notes)
        }
      })

      return () => {
        osmd.clear()
        osmdRef.current = null
      }
    }, [musicXml])

    return <div ref={containerRef} className={styles.container} />
  },
)
