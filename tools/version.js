'use strict';
// game.js 안의 BUILD_ID(내용 해시 앞 7자리)를 갱신한다. 해시는 BUILD_ID 값을 빈 문자열로 둔 상태의 game.js 내용으로 계산하므로 같은 내용이면 항상 같은 값이고(커밋과 무관), 화면의 버전 표시로 최신 파일인지 확인할 수 있다.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const file = path.join(__dirname, '..', 'game.js'), src = fs.readFileSync(file, 'utf8');
const re = /^const BUILD_ID = '[0-9a-f]*';.*$/m; if (!re.test(src)) { console.error('game.js에 BUILD_ID 줄이 없음'); process.exit(1); }
const marker = "/* 자동 생성: npm run version (이 줄을 뺀 game.js 내용 해시) */";
const blank = src.replace(re, "const BUILD_ID = ''; " + marker), id = crypto.createHash('sha256').update(blank).digest('hex').slice(0, 7);
const out = src.replace(re, "const BUILD_ID = '" + id + "'; " + marker);
if (out !== src) { fs.writeFileSync(file, out); console.log('BUILD_ID ' + id + ' (갱신)'); } else console.log('BUILD_ID ' + id + ' (그대로)');
