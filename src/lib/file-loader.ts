const DB_NAME = 'keyscore'
const STORE_NAME = 'directory-handles'
const HANDLE_KEY = 'music-folder'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveDirectoryHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof indexedDB === 'undefined') return null

  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const request = tx.objectStore(STORE_NAME).get(HANDLE_KEY)
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
  })
}

export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  const handle = await window.showDirectoryPicker()
  await saveDirectoryHandle(handle)
  return handle
}

export function supportsDirectoryPicker(): boolean {
  return typeof window.showDirectoryPicker === 'function'
}

/** 파일 input으로 MusicXML 파일을 선택한다 (showDirectoryPicker 미지원 브라우저용) */
export function pickFiles(): Promise<File[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.musicxml,.xml,.mxl'
    input.multiple = true

    input.addEventListener('change', () => {
      const files = input.files
      if (!files || files.length === 0) {
        reject(new DOMException('No files selected', 'AbortError'))
        return
      }
      resolve(Array.from(files))
    })

    // 취소 감지: focus 복귀 후 파일이 없으면 abort
    input.addEventListener('cancel', () => {
      reject(new DOMException('User cancelled', 'AbortError'))
    })

    input.click()
  })
}

export async function listMusicXmlFiles(
  dirHandle: FileSystemDirectoryHandle,
): Promise<string[]> {
  const files: string[] = []
  for await (const entry of dirHandle.values()) {
    if (
      entry.kind === 'file' &&
      (entry.name.endsWith('.musicxml') || entry.name.endsWith('.xml'))
    ) {
      files.push(entry.name)
    }
  }
  return files.sort()
}

export async function readMusicXmlFile(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
): Promise<string> {
  const fileHandle = await dirHandle.getFileHandle(fileName)
  const file = await fileHandle.getFile()
  return file.text()
}
