# 출처 및 라이선스

## 규칙 엔진

- 원본: https://github.com/itsent-lab/hwatu
- 리비전: `c02db44022b456df75c2e131b5e5cdd91d79764f`
- Copyright (c) 2026 NSJ <itsent@itsent.co.kr>, MIT.
- 원문 고지: `licenses/Hwatu-MIT.txt`.
- `vendor/engine`의 TypeScript 사본과 `engine`의 변환본을 포함합니다. 상대 경로에 `.js`를 붙여 브라우저 모듈로 변환했고, `playBomb`에 선택한 뒤집기 패 인자를 추가했습니다. 별도 화면·상태 연결 코드는 이 게임을 위해 작성했습니다.
- `vendor/tests`와 `vendor/upstream-game-rules.md`는 원본 테스트·규칙 참고 사본입니다.

## 화투 그림

- 개별 SVG: Spenĉjo.
- 한국식 화투 원본 디자인: Marcus Richert.
- 일부 Hanafuda 그래픽: Louie Mantia, Jr.
- 원본: https://commons.wikimedia.org/wiki/Category:SVG_Hwatu
- 라이선스: CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/
- 원본 고지 및 파일별 출처: `cards/hwatu/ATTRIBUTION.txt`, `cards/hwatu/verification.json`.
- 원본 저장소의 SVG 파일을 수정하지 않고 사용합니다. 보너스패의 문자·배경 표시는 별도로 작성한 CSS입니다.

## 효과음·선언 음성

- 출처·원저작자·개별 조건: `audio/ATTRIBUTION.txt`.
- Freesound의 el_boss, BMacZero, thomasjaunism 등의 카드·접촉·나무 소리와 Kenney의 효과음: 원본 고지상 CC0.
- **한국어 선언은 Supertonic 3으로 생성된 AI 합성음성**입니다. 특정 인물의 실제 녹음이라고 표시하지 않습니다.
- 원본 저장소의 음원 파일을 수정하지 않고 사용합니다. 게임 재생 시 음량만 조절합니다. 배경음악은 포함하지 않습니다.
- 모델의 고지·이용 조건: `licenses/BigScience-OpenRAIL-M.txt` 및 `audio/ATTRIBUTION.txt`.
- 내려받은 음원·고지의 원본 Git blob 대조 기록: `audio-provenance.json`.

원본 프로젝트의 전체 고지는 `UPSTREAM_NOTICES.md`에도 보존합니다. 이 파일이 설명하는 다른 서버 라이브러리 등을 이 게임이 모두 사용하는 것은 아닙니다. 개별 음원·카드의 조건은 애플리케이션의 MIT 라이선스로 대체되지 않습니다.
