import { useState, useEffect } from 'react'
import {
  pickDirectory,
  loadDirectoryHandle,
  listMusicXmlFiles,
  readMusicXmlFile,
} from '../lib/file-loader'
import styles from './FolderPicker.module.css'

interface FolderPickerProps {
  onLoad: (musicXml: string) => void
}

export default function FolderPicker({ onLoad }: FolderPickerProps) {
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(
    null,
  )
  const [files, setFiles] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDirectoryHandle().then(async (handle) => {
      if (!handle) return

      const permission = await handle.requestPermission({ mode: 'read' })
      if (permission !== 'granted') return

      setDirHandle(handle)
      const musicFiles = await listMusicXmlFiles(handle)
      setFiles(musicFiles)
    })
  }, [])

  async function handlePickFolder() {
    try {
      setError(null)
      const handle = await pickDirectory()
      setDirHandle(handle)
      const musicFiles = await listMusicXmlFiles(handle)
      setFiles(musicFiles)
      setSelectedFile(null)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError('폴더를 열 수 없습니다')
    }
  }

  async function handleSelectFile(fileName: string) {
    if (!dirHandle) return
    try {
      setError(null)
      setSelectedFile(fileName)
      const xml = await readMusicXmlFile(dirHandle, fileName)
      onLoad(xml)
    } catch {
      setError(`파일을 읽을 수 없습니다: ${fileName}`)
    }
  }

  return (
    <div className={styles.picker}>
      <button onClick={handlePickFolder} className={styles.folderButton}>
        폴더 선택
      </button>
      {dirHandle && <span className={styles.folderName}>{dirHandle.name}</span>}
      {error && <p className={styles.error}>{error}</p>}
      {files.length > 0 && (
        <ul className={styles.fileList}>
          {files.map((file) => (
            <li key={file}>
              <button
                onClick={() => handleSelectFile(file)}
                className={
                  file === selectedFile
                    ? styles.fileButtonActive
                    : styles.fileButton
                }
              >
                {file}
              </button>
            </li>
          ))}
        </ul>
      )}
      {dirHandle && files.length === 0 && (
        <p className={styles.empty}>MusicXML 파일이 없습니다</p>
      )}
    </div>
  )
}
