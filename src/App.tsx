import { useState } from 'react'
import FolderPicker from './components/FolderPicker'
import SheetMusic from './components/SheetMusic'
import styles from './App.module.css'

function App() {
  const [musicXml, setMusicXml] = useState<string | null>(null)

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Keyscore</h1>
      </header>
      <FolderPicker onLoad={setMusicXml} />
      {musicXml && <SheetMusic musicXml={musicXml} />}
    </div>
  )
}

export default App
