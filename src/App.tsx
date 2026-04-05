import { useRef, useState } from 'react'
import FolderPicker from './components/FolderPicker'
import SheetMusic from './components/SheetMusic'
import type { SheetMusicHandle } from './components/SheetMusic'
import styles from './App.module.css'

function App() {
  const [musicXml, setMusicXml] = useState<string | null>(null)
  const sheetMusicRef = useRef<SheetMusicHandle>(null)

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Keyscore</h1>
      </header>
      <FolderPicker onLoad={setMusicXml} />
      {musicXml && (
        <>
          <div className={styles.controls}>
            <button
              onClick={() => sheetMusicRef.current?.cursorReset()}
              className={styles.controlButton}
            >
              ⏮ 처음
            </button>
            <button
              onClick={() => sheetMusicRef.current?.cursorPrevious()}
              className={styles.controlButton}
            >
              ◀ 이전
            </button>
            <button
              onClick={() => sheetMusicRef.current?.cursorNext()}
              className={styles.controlButton}
            >
              다음 ▶
            </button>
          </div>
          <SheetMusic ref={sheetMusicRef} musicXml={musicXml} />
        </>
      )}
    </div>
  )
}

export default App
