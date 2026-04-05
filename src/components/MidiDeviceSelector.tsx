import type { MidiDevice } from '../hooks/useMidi'
import styles from './MidiDeviceSelector.module.css'

interface MidiDeviceSelectorProps {
  devices: MidiDevice[]
  selectedDeviceId: string | null
  onSelect: (deviceId: string | null) => void
  error: string | null
}

export function MidiDeviceSelector({
  devices,
  selectedDeviceId,
  onSelect,
  error,
}: MidiDeviceSelectorProps) {
  if (error) {
    return <div className={styles.error}>{error}</div>
  }

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        MIDI 디바이스:
        <select
          className={styles.select}
          value={selectedDeviceId ?? ''}
          onChange={(e) => onSelect(e.target.value || null)}
        >
          <option value="">선택 안 함</option>
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name}
            </option>
          ))}
        </select>
      </label>
      {devices.length === 0 && (
        <span className={styles.hint}>연결된 MIDI 디바이스가 없습니다</span>
      )}
    </div>
  )
}
