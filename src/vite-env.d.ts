/// <reference types="vite/client" />

// File System Access API (not yet in TypeScript standard types)
interface FileSystemDirectoryHandle {
  requestPermission(opts?: {
    mode?: 'read' | 'readwrite'
  }): Promise<'granted' | 'denied' | 'prompt'>
}

interface Window {
  showDirectoryPicker(): Promise<FileSystemDirectoryHandle>
}
