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
- [ ] OSMD 설치 + 기본 렌더링 — OSMD 패키지 추가, 하드코딩된 fixture로 악보 표시 확인
- [ ] MusicXML 파일 로드 UI — 파일 선택 버튼, FileReader로 XML 읽기, OSMD에 전달
- [ ] 커서 표시 — OSMD cursor API로 현재 위치 하이라이트
- [ ] 커서 이동 — next()/previous() 호출로 마디 단위 이동 확인 (임시 버튼)

### M2: MIDI 입력 + 실시간 판정
- [ ] Web MIDI API 연결
- [ ] OSMD 파싱 결과에서 NoteSequence 추출
- [ ] Note Matcher 구현 (2-phase)
- [ ] Grader 구현 (Perfect/Good/Miss/Error)
- [ ] 실시간 판정 표시 (악보 위 음표 색상 변경)
- [ ] 세션 통계 (정확도, 판정 카운트)

### M3: 리뷰 모드
- [ ] Session Recorder (연주 기록 저장)
- [ ] 판정 결과 → 악보 음표 색상 표시 (연주 끝난 후)
- [ ] 마디 네비게이션

### M4: 추가 기능
- [ ] 폴링 노트 모드 (악보 암기 후 타이밍 연습용)
- [ ] MIDI 파일 입력 지원 (폴링 노트용)
- [ ] Wait 모드
- [ ] BPM 조절
- [ ] 구간 반복 연습
- [ ] 오디오 재생
- [ ] 연습 이력 저장 (localStorage)
