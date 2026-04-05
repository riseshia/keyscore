import { describe, expect, it } from 'vitest'
import { listMusicXmlFiles, readMusicXmlFile } from '../lib/file-loader'

function createMockDirHandle(
  entries: { name: string; kind: 'file' | 'directory' }[],
): FileSystemDirectoryHandle {
  return {
    values: async function* () {
      for (const entry of entries) {
        yield entry as FileSystemHandle
      }
    },
    getFileHandle: async (name: string) => {
      const entry = entries.find((e) => e.name === name && e.kind === 'file')
      if (!entry) throw new DOMException('Not found', 'NotFoundError')
      return {
        getFile: async () => new File(['<score/>'], name),
      } as FileSystemFileHandle
    },
  } as unknown as FileSystemDirectoryHandle
}

describe('listMusicXmlFiles', () => {
  it('MusicXML/XML 파일만 필터링한다', async () => {
    const handle = createMockDirHandle([
      { name: 'song.musicxml', kind: 'file' },
      { name: 'score.xml', kind: 'file' },
      { name: 'readme.txt', kind: 'file' },
      { name: 'data.json', kind: 'file' },
      { name: 'subfolder', kind: 'directory' },
    ])

    const files = await listMusicXmlFiles(handle)
    expect(files).toEqual(['score.xml', 'song.musicxml'])
  })

  it('파일이 없으면 빈 배열을 반환한다', async () => {
    const handle = createMockDirHandle([])
    const files = await listMusicXmlFiles(handle)
    expect(files).toEqual([])
  })

  it('결과를 알파벳 순으로 정렬한다', async () => {
    const handle = createMockDirHandle([
      { name: 'z-song.musicxml', kind: 'file' },
      { name: 'a-song.musicxml', kind: 'file' },
      { name: 'm-song.xml', kind: 'file' },
    ])

    const files = await listMusicXmlFiles(handle)
    expect(files).toEqual(['a-song.musicxml', 'm-song.xml', 'z-song.musicxml'])
  })
})

describe('readMusicXmlFile', () => {
  it('파일 내용을 텍스트로 읽는다', async () => {
    const handle = createMockDirHandle([
      { name: 'test.musicxml', kind: 'file' },
    ])

    const content = await readMusicXmlFile(handle, 'test.musicxml')
    expect(content).toBe('<score/>')
  })
})
