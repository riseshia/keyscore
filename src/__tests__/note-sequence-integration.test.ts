import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { IXmlElement, MusicSheetReader } from 'opensheetmusicdisplay'
import { extractNoteSequence } from '../lib/note-sequence'

function loadSheet(fixtureName: string) {
  const xml = readFileSync(
    join(__dirname, '../../fixtures', fixtureName),
    'utf-8',
  )
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'text/xml')
  const root = new IXmlElement(doc.documentElement)
  const reader = new MusicSheetReader()
  return reader.createMusicSheet(root, fixtureName)
}

describe('extractNoteSequence (integration)', () => {
  it('엘리제를 위하여에서 음표를 추출한다', () => {
    const sheet = loadSheet('fur-elise.musicxml')
    const notes = extractNoteSequence(sheet)

    // 음표가 추출되어야 한다
    expect(notes.length).toBeGreaterThan(0)

    // 모든 음표는 유효한 MIDI 피치를 가져야 한다 (0-127)
    for (const note of notes) {
      expect(note.pitch).toBeGreaterThanOrEqual(0)
      expect(note.pitch).toBeLessThanOrEqual(127)
    }

    // 모든 음표는 양수 duration을 가져야 한다
    for (const note of notes) {
      expect(note.duration).toBeGreaterThan(0)
    }

    // startTime 순으로 정렬되어야 한다
    for (let i = 1; i < notes.length; i++) {
      expect(notes[i].startTime).toBeGreaterThanOrEqual(notes[i - 1].startTime)
    }

    // startTime은 0 이상이어야 한다
    expect(notes[0].startTime).toBeGreaterThanOrEqual(0)
  })

  it('엘리제 첫 마디의 음표를 정확히 추출한다', () => {
    const sheet = loadSheet('fur-elise.musicxml')
    const notes = extractNoteSequence(sheet)

    // 엘리제 시작: E5(76) D#5(75)  (anacrusis, 3/8 pickup)
    expect(notes[0].pitch).toBe(76) // E5
    expect(notes[0].startTime).toBe(0)
    expect(notes[1].pitch).toBe(75) // D#5
  })
})
