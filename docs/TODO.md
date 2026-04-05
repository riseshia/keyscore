# TODO

## 결정 완료

### 상태 관리

**→ props 단방향.** 라이브러리 없이 시작. 필요해지면 그때 도입.

### MusicXML → NoteSequence 변환 방법

**→ OSMD 내부 데이터에서 추출.** 악보 렌더링이 메인이므로 OSMD 파싱 결과를 재활용.

### 런타임 / 테스트

**→ Node + Vite + Vitest.**

## 결정 보류 (우선순위 낮음)

### 오디오 재생

- [ ] Web Audio API + SoundFont (직접 구현)
- [ ] Tone.js (고수준 래퍼)
- [ ] 재생 기능 없이 시작 (MIDI 키보드 소리만 사용)

### MIDI 키보드 소리

- [ ] 앱에서 소리 내기 (Web Audio + SoundFont)
- [ ] 키보드 자체 소리에 의존 (FP-90X는 자체 스피커 있음)
- [ ] 둘 다 지원 (토글)

### Wait 모드 초기 구현 범위

- [ ] 단순 Wait (Sightread 방식) — 노트 안 치면 정지
- [ ] 3단계 상태 머신 (PianoBooster 방식) — 초기부터

## 마일스톤

### M0: 프로젝트 셋업

- [x] GitHub 리포 생성
- [x] CLAUDE.md, DESIGN.md, TODO.md
- [x] Vite + React + TypeScript 초기화
- [x] ESLint + Prettier 설정
- [x] Vitest 설정
- [x] 테스트용 MusicXML 파일 추가 (엘리제를 위하여)
- [x] agent-browser 동작 확인 세팅

### M1: MusicXML 로드 + OSMD 악보 렌더링

- [x] OSMD 설치 + 기본 렌더링 — OSMD 패키지 추가, 파일 선택 시 악보 표시
- [x] MusicXML 파일 로드 UI — File System Access API로 로컬 폴더 지정, 파일 목록 표시
- [x] 커서 표시 — OSMD cursor API로 현재 위치 하이라이트
- [x] 커서 이동 — next()/previous()/reset() (임시 버튼)

### M2: MIDI 입력 + 실시간 판정

- [x] OSMD 파싱 결과에서 NoteSequence 추출 — OSMD 내부 데이터 → `SongNote[]` 변환
- [x] NoteSequence 추출 테스트 — 엘리제 fixture 통합 테스트 + OSMD pitch offset(+12) 수정
- [x] Web MIDI API 연결 — useMidi hook, 디바이스 선택 UI
- [x] 모의 MIDI 입력 UI — 컴퓨터 키보드 → MIDI 이벤트 시뮬레이션 (2옥타브, C4~F5)
- [x] Grader 구현 + 테스트 — 타이밍 매칭 + 판정 (Perfect/Good/Miss/Error), 12 테스트
- [x] Game Loop — useSession hook, 첫 음 트리거, 50ms flush, 자동 종료
- [x] 세션 통계 UI — 판정 카운트 실시간 표시
- [x] 커서 자동 이동 — game loop에서 시간 진행에 따라 OSMD cursor.next() 호출

### M3: 리뷰 모드 + 판정 시각화

#### M3-1: GradeResult에 음표 인덱스 추가
- [x] GradeResult에 `noteIndex: number` 추가 — OSMD 음표 매핑용 인덱스
- [x] Grader 테스트 업데이트

#### M3-2: Session Recorder
- [x] `GradeResultRecord` / `SessionResult` 타입 정의
- [x] useSession에서 GradeResult를 `GradeResultRecord[]`로 누적 기록
- [x] 세션 종료 시 `SessionResult` 반환 (songNotes + gradeResults + stats + accuracy)

#### M3-3: Score Colorizer (판정 → 음표 색상)
- [x] `extractNoteSequenceWithRefs` — OSMD Note 객체 참조를 SongNote와 병행 보존
- [x] `colorizeNote(osmd, osmdNote, grade)` — `osmd.rules.GNote().setColor()` 사용
- [x] 연주 중 실시간 색상 반영 — onGradeResult 콜백에서 즉시 색상 적용
- [x] SheetMusic handle에 `colorNote()` / `resetColors()` 노출

#### M3-4: 리뷰 UI
- [x] 세션 결과 요약 화면 — 정확도(%) 표시
- [x] "다시 연습" 버튼 — 색상 리셋 + 커서 리셋 + idle로 복귀
- [ ] 리뷰 모드에서 마디 네비게이션 (이전/다음 마디) — M4로 이동

### M4: 추가 기능

- [ ] iPad Safari 대응 — File System Access API 미지원, `<input type="file">` fallback
- [ ] 폴링 노트 모드 (악보 암기 후 타이밍 연습용)
- [ ] MIDI 파일 입력 지원 (폴링 노트용)
- [ ] Wait 모드
- [ ] BPM 조절
- [ ] 구간 반복 연습
- [ ] 오디오 재생
- [ ] 연습 이력 저장 (localStorage)
