# Keyscore Design Document

## 1. 개요

피아노 연습 웹 앱. MusicXML 악보를 로드하여 악보를 보면서 연습하고, MIDI 키보드 입력을 실시간 판정한 뒤 악보 위에 결과를 색상으로 표시하여 리뷰한다. 폴링 노트 모드는 악보 암기 후 타이밍 연습용(심화).

## 2. 아키텍처

```
[MusicXML File]
      │
      ▼
[MusicXML Parser] ─────────────────────────────────┐
      │                                             │
      ▼                                             ▼
[NoteSequence]                              [OSMD Renderer]
 (피치, 타이밍, 길이, 핸드)                     (악보 뷰 - 리뷰 모드)
      │                                             │
      ▼                                             ▼
[Falling Notes Renderer]                    [Score Colorizer]
 (Canvas 2D - 연습 모드)                     (판정 결과 → 음표 색상)
      │
      ▼
[Game Loop] ◄── [MIDI Input] (Web MIDI API)
      │              │
      ▼              ▼
[Note Matcher] ──► [Grader]
      │              │
      ▼              ▼
[Session Recorder] ──► [Session Store]
```

### 핵심 모듈

| 모듈                       | 책임                                                               |
| -------------------------- | ------------------------------------------------------------------ |
| **MusicXML Parser**        | MusicXML → NoteSequence 변환. OSMD 또는 별도 파서 사용             |
| **NoteSequence**           | 곡의 노트 데이터. `{pitch, startTime, duration, hand}[]`           |
| **Game Loop**              | 1ms setInterval로 시간 진행, 판정 트리거, 렌더 갱신 요청           |
| **MIDI Input**             | Web MIDI API로 키보드 입력 수신. `{note, velocity, timestamp}`     |
| **Note Matcher**           | 입력된 노트와 기대 노트 매칭. 2-phase: lateNotes + upcomingNotes   |
| **Grader**                 | 타이밍 차이로 판정. Perfect (≤50ms) / Good (≤300ms) / Miss / Error |
| **Session Recorder**       | 연주 기록 저장. `{note, time, velocity, matchedTo, grade}[]`       |
| **Falling Notes Renderer** | Canvas 2D 폴링 노트. requestAnimationFrame                         |
| **OSMD Renderer**          | MusicXML 악보 표시 (리뷰 모드)                                     |
| **Score Colorizer**        | 판정 결과를 악보 음표에 색상으로 입히기                            |

## 3. 데이터 모델

### NoteSequence (곡 데이터)

```typescript
interface SongNote {
  pitch: number // MIDI note number (0-127)
  startTime: number // 시작 시간 (ms)
  duration: number // 길이 (ms)
  hand: 'left' | 'right'
}
```

### PlayedNote (연주 기록)

```typescript
interface PlayedNote {
  pitch: number
  time: number // 실제 연주 시간 (ms)
  velocity: number
  duration: number // 실제 누른 길이 (ms)
  matchedTo: SongNote | null // 매칭된 원본 노트 (없으면 Error)
  grade: 'perfect' | 'good' | 'miss' | 'error'
}
```

### SessionResult (세션 결과)

```typescript
interface SessionResult {
  songNotes: SongNote[]
  playedNotes: PlayedNote[]
  stats: {
    perfect: number
    good: number
    missed: number
    error: number
    accuracy: number // (perfect + good) / total
  }
}
```

## 4. 판정 알고리즘

Sightread 방식을 기반으로, PianoBooster의 비대칭 페널티 아이디어를 참고.

### 타이밍 윈도우

```
PERFECT_RANGE = 50ms
GOOD_RANGE = 300ms
```

### 매칭 (2-phase)

1. **Late notes**: 이미 지나간 노트 중 아직 매칭 안 된 것. 입력이 오면 시간차 계산.
2. **Upcoming notes**: 아직 안 온 노트 (일찍 친 경우). 같은 피치의 가장 가까운 노트와 매칭.
3. **매칭 실패**: Error.

### Miss 판정

곡 진행 중 노트가 GOOD_RANGE(300ms)를 초과하면 Miss로 확정.

### BPM 보정

배속 변경 시 타이밍 윈도우를 비례 조정:

```
adjustedDiff = (actualDiff * 1000) / bpmModifier
```

## 5. 렌더링

### 폴링 노트 (연습 모드)

- Canvas 2D, requestAnimationFrame (~60fps)
- PIXELS_PER_SECOND: 설정 가능 (기본 225px)
- 노트: roundRect, 오른손 보라색, 왼손 주황색
- 판정선: 화면 하단
- viewport 최적화: 화면 내 노트만 렌더링

### 악보 뷰 (리뷰 모드)

- OSMD로 MusicXML 렌더링
- 판정 결과에 따라 음표 색상 변경:
  - Perfect: 초록 (#00cc00)
  - Good: 노랑 (#cccc00)
  - Miss: 빨강 (#cc0000)
  - Error: 빨간색 별도 마커
- OSMD의 커서 API로 특정 마디로 이동 가능

## 6. Wait 모드 (Follow You)

올바른 노트를 칠 때까지 곡 진행을 멈추는 모드.

### 기본 구현 (v1)

- 단순 Wait 플래그: 현재 노트를 안 치면 시간 정지
- Sightread 방식

### 향후 확장 (v2)

- PianoBooster식 3단계 상태 머신 (searching → earlyNotes → waiting)
- 정확도에 따른 동적 난이도 전환

## 7. 화면 구성

### 연습 모드 (악보)

```
┌─────────────────────────────────┐
│  곡 제목 / BPM / 진행도          │
├─────────────────────────────────┤
│                                 │
│  [OSMD 악보 - 현재 위치 커서]     │
│                                 │
├─────────────────────────────────┤
│  Perfect: 0  Good: 0  Miss: 0  │
└─────────────────────────────────┘
```

### 연습 모드 (폴링 노트 — 심화)

```
┌─────────────────────────────────┐
│  곡 제목 / BPM / 진행도          │
├─────────────────────────────────┤
│                                 │
│     [폴링 노트 Canvas]           │
│                                 │
│  ─ ─ ─ ─ 판정선 ─ ─ ─ ─ ─      │
│     [피아노 키보드 표시]          │
├─────────────────────────────────┤
│  Perfect: 0  Good: 0  Miss: 0  │
└─────────────────────────────────┘
```

### 리뷰 모드

```
┌─────────────────────────────────┐
│  세션 결과 요약                   │
│  정확도: 85%  Perfect/Good/Miss  │
├─────────────────────────────────┤
│                                 │
│     [OSMD 악보 - 색상 표시]       │
│                                 │
├─────────────────────────────────┤
│  마디 네비게이션 / 재연습 버튼    │
└─────────────────────────────────┘
```

## 8. 사용 시나리오

### 시나리오 1: 곡 로드

1. 앱을 열고 MusicXML 파일을 선택한다
2. OSMD가 악보를 렌더링한다
3. 재생 전 대기 상태

### 시나리오 2: 악보 보면서 연습 (전체)

1. 재생 시작 → 첫 음을 치면 곡이 시작된다 (첫 음 트리거)
2. 악보 위 커서가 현재 위치를 따라 이동
3. MIDI 키보드로 음을 치면 실시간 판정 (Perfect/Good/Miss/Error)
4. 지나간 음표에 판정 색상 표시
5. 곡 끝나면 세션 결과 요약 (정확도, 판정 카운트)

### 시나리오 3: 구간 지정 연습

1. 시작 마디 ~ 끝 마디를 지정한다
2. 이후 시나리오 2와 동일 (지정 구간만 진행)

### 시나리오 4: 배속 연습

1. 배속을 변경한다 (0.5x, 0.75x, 1.0x 등)
2. 변경된 BPM으로 시나리오 2 또는 3 진행
3. 타이밍 윈도우는 배속에 비례하여 자동 보정

### 시나리오 5: 리뷰

1. 연습 후 리뷰 모드 진입
2. 악보 전체에 판정 색상 표시 (초록/노랑/빨강)
3. 마디 네비게이션으로 이동, 해당 구간 연주 소리 재생
4. Error 있는 마디에 마커 표시
5. "이 구간만 재연습" → 시나리오 3으로 이동
