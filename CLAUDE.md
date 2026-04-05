# Keyscore

피아노 연습 + 판정 + 리뷰를 위한 웹 앱.

## Quick Context

MusicXML 악보를 로드하여 폴링 노트/악보 뷰로 표시하고, MIDI 키보드 입력을 받아 실시간 판정(Perfect/Good/Miss/Error)을 수행한다. 연습 후 악보 위에 판정 결과를 색상으로 표시하여 리뷰할 수 있다.

## Tech Stack

- **Framework**: React + TypeScript + Vite
- **악보 렌더링**: OSMD (OpenSheetMusicDisplay) — MusicXML 로드 + 악보 표시
- **폴링 노트**: Canvas 2D (직접 구현)
- **MIDI 입력**: Web MIDI API
- **상태 관리**: props 단방향 (라이브러리 없음)
- **테스트**: Vitest

## Key Files

| File/Dir | Purpose |
|----------|---------|
| `docs/DESIGN.md` | 아키텍처, 알고리즘, 설계 결정 |
| `docs/TODO.md` | 미결정 사항, 할 일 |
| `src/` | 소스 코드 |
| `fixtures/` | 테스트용 MusicXML 파일 |

## Development

```bash
npm install        # 의존성 설치
npm run dev        # 개발 서버 (Vite)
npm run build      # 프로덕션 빌드
npm run test       # Vitest 실행
npm run lint       # ESLint
```

## 개발 가이드라인

### TDD (Red-Green-Refactor)

1. **Red**: 실패하는 테스트를 먼저 작성한다.
2. **Green**: 테스트를 통과시키는 최소한의 코드만 작성한다.
3. **Refactor**: 테스트 통과를 유지하면서 코드를 정리한다.

### 원칙

- **요청된 것만 구현한다.** 한 번 쓰이는 코드에 추상화를 만들지 않는다.
- **인접 코드를 "개선"하지 않는다.** 기존 스타일에 맞춘다.
- **불확실하면 질문한다.** 추측하지 않는다.

### 커밋 / PR

- **커밋 메시지, PR 제목/본문은 한국어로 작성한다.**

### 동작 확인 (agent-browser)

인수 테스트 스크립트 대신 agent-browser로 직접 동작을 확인한다.

```bash
# 1. dev 서버 시작 (백그라운드)
npm run dev -- --port 5199 &

# 2. 페이지 열기
agent-browser open http://localhost:5199 --session keyscore

# 3. 스냅샷 (접근성 트리)
agent-browser snapshot --session keyscore

# 4. 스크린샷
agent-browser screenshot /tmp/keyscore.png --session keyscore

# 5. 요소 조작 (스냅샷의 ref 사용)
agent-browser click @e1 --session keyscore

# 6. 정리
agent-browser close --session keyscore
kill %1  # dev 서버 종료
```

**MIDI 입력 테스트:** agent-browser에는 `page.evaluate`가 없으므로, dev 모드에서 모의 MIDI 이벤트를 주입할 수 있는 UI를 앱 내에 제공한다 (예: 테스트 패널, URL 쿼리 파라미터 등).
