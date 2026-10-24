# Tank Arena (diep.io 스타일 2D 탱크 슈터)

HTML/CSS/바닐라 JS(Canvas). 외부 에셋과 빌드 도구는 없고, `index.html`을 브라우저로 열면 실행된다. 답변은 한국어로 한다.

## 파일
- `index.html`, `style.css`, `game.js`: 게임 전체(로직은 `game.js` 하나, 설정은 위쪽 `CFG`).
- `tests/run.js`: 가짜 DOM으로 `game.js`를 화면 없이 돌리는 시뮬레이션 테스트(Node.js만 필요). `tests/hdr.js`, `seed.js`, `t_*.js`는 이전 단계의 보조 도구.
- `docs/build_doc.js`: 게임 작동 원리 문서(`Tank_Arena_Mechanics_Review.docx`) 생성기. `npm install` 후 `node docs/build_doc.js`. 문서는 `docs/Tank_Arena_Mechanics_Review.docx`로 저장소 안에 생성된다(`DOC_OUT` 환경변수로 경로 변경).
- `docs/PENDING.md`: 문서에 아직 반영하지 않은 작은 수정 목록(문서의 기준 해시 포함).
- `backups/`: 큰 변경 직전 백업(`날짜_이름/`, `README.txt`에 복원 방법). 없을 수 있다.

## 설정 위치 (`game.js` 위쪽)
공통 수치(총알, 반동, 체력, 맵 등)와 `CFG.bots`(소환·성장), `CFG.botTypes`(성격 7유형), `CFG.botFx`(성격 수치 → 행동), `CFG.botFight`(싸움·도주 판단 R, 위협 기억), `CFG.botBuild`(능력치 투자), `CFG.scoreboardSmooth`.
모든 값은 설정으로 빼고, 큰 행동 변경에는 이전 동작으로 돌아가는 스위치를 둔다(예: `botFight.mode = 'legacy'`, `botFight.fleeMemory = 0`).

## 개발자 모드
`\` 키로 켜면(레벨 +1) F2로 패널을 토글하고, 휠로 줌한다. 화면의 봇 이름 옆에 `유형  행동 R값`이 표시된다.

## 테스트
- 게임 폴더(`tank-arena`)에서 `node tests/run.js <시나리오[,...]> [--seed N --runs N --min N --set 경로=값 --game 경로 --save 이름 --compare 이름]`. 목록은 `node tests/run.js --list`.
- 규칙 확인: `rulecheck`, `shapes`, `knockcheck`, `clashcheck`. 봇 AI 확인: `fightcheck`, `memorycheck`, `scorecheck`, `traitcheck`, `buildcheck`. 봇 측정: `aicheck`, `types`, `pop`. 이상 감시: `sanity`. 성능: `perf`.
- 문자열 `--set` 값은 JSON으로 쓴다(`--set 'botFight.mode="legacy"'`).
- **시뮬레이션 테스트는 사용자가 하라고 할 때만 실행한다. 필요해 보이면 실행하지 말고 먼저 물어본다.** 코드를 고친 뒤 문법 검사(`npm run check`)는 항상 한다.

## 작업 규칙
1. 코드를 고치기 전에 `backups/날짜_이름/`에 백업하고 `README.txt`에 복원 방법을 적는다. git으로 대체할지는 사용자에게 먼저 묻는다.
2. 설계는 먼저 말로 설명하고(영향과 위험 포함), 사용자가 "코드짜"라고 하면 구현한다. "수정하지 말고"라고 하면 파일을 바꾸지 않는다.
3. 규칙에 영향을 주는 변경이면 `docs/build_doc.js`를 고쳐 문서를 다시 만든다. 표시나 개발자 도구 같은 작은 수정은 `docs/PENDING.md`에 모아 두고, 사용자가 요청하거나 파일을 보낼 때 한꺼번에 반영한다.
4. 문서의 설정 표(9장)와 부록 A는 새 설정을 추가할 때마다 같이 갱신한다. 문서의 7장 이후 표는 `game.js`의 `CFG` 값을 읽어서 만든다.
5. 문서의 남은 항목(11.1, 미해결 문제 목록)은 사용자가 보여 달라고 할 때만 보여준다.
6. 공식을 설명할 때는 식에 쓰인 기호의 뜻도 같이 적는다.
7. 코드 한 줄 안에서 `//` 주석을 뒤에 다른 코드가 이어지는 위치에 쓰지 않는다(뒤 코드가 주석 처리된 적이 있다). 그런 곳은 `/* */`를 쓴다.
8. 문서나 설명에서 수치를 말할 때는 측정한 값인지 계산한 추정인지 구분하고, 확인하지 못한 것은 확인하지 못했다고 쓴다.

## 규칙 요약 (자세한 내용은 문서)
- 총알은 체력(관통력)을 가진 접촉 교환 방식이고, 밀림·꺾임은 질량 모델이며, 총알끼리 충돌 뒤에는 방향이 고정된다(`bulletClashKeepDir`).
- 봇 AI는 성격 7유형 + 점수제 목표 선택 + 전투 우위 R(레벨과 체력%)로 싸움/도주를 정하고, 도주 후 5초 동안 위협을 기억한다.
- 규칙을 바꾸면 반드시 문서(7장 봇 AI, 9장 설정 표, 부록 A)를 확인한다.
