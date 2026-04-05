import { useEffect, useRef } from 'react'
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import styles from './SheetMusic.module.css'

interface SheetMusicProps {
  musicXml: string
}

export default function SheetMusic({ musicXml }: SheetMusicProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const osmd = new OpenSheetMusicDisplay(containerRef.current, {
      autoResize: true,
      backend: 'svg',
    })
    osmdRef.current = osmd

    osmd.load(musicXml).then(() => {
      osmd.render()
    })

    return () => {
      osmd.clear()
      osmdRef.current = null
    }
  }, [musicXml])

  return <div ref={containerRef} className={styles.container} />
}
