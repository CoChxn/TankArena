'use strict';
// game.js 안의 BUILD_ID(내용 해시 앞 7자리)와 BUILD_AT(그 해시가 바뀐 시각, UTC 분 단위), 그리고 같은 값을 담은 version.json을 갱신한다. 해시는 BUILD_ID 값을 빈 문자열로 둔 상태의 game.js 내용으로 계산하므로 같은 내용이면 항상 같은 값이고(커밋과 무관), 화면의 버전 표시로 최신 파일인지 확인할 수 있다.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const file = path.join(__dirname, '..', 'game.js'), src = fs.readFileSync(file, 'utf8');
const re = /^const BUILD_ID = '[0-9a-f]*', BUILD_AT = '[^']*';.*$/m; if (!re.test(src)) { console.error('game.js에 BUILD_ID 줄이 없음'); process.exit(1); }
const marker = "/* 자동 생성: npm run version (이 줄을 뺀 game.js 내용 해시와, 그 해시가 바뀐 시각(UTC)) */";
const blank = src.replace(re, "const BUILD_ID = '', BUILD_AT = ''; " + marker), id = crypto.createHash('sha256').update(blank).digest('hex').slice(0, 7);
const cur = /BUILD_ID = '([0-9a-f]*)', BUILD_AT = '([^']*)'/.exec(src), at = cur[1] === id && cur[2] ? cur[2] : new Date().toISOString().slice(0, 16) + 'Z'; /* 내용(해시)이 바뀐 때만 시각을 새로 기록 */
const out = src.replace(re, "const BUILD_ID = '" + id + "', BUILD_AT = '" + at + "'; " + marker), ver = JSON.stringify({ id, at }) + '\n', vf = path.join(__dirname, '..', 'version.json');
if (out !== src) fs.writeFileSync(file, out); if (!fs.existsSync(vf) || fs.readFileSync(vf, 'utf8') !== ver) fs.writeFileSync(vf, ver);
console.log('BUILD_ID ' + id + ' ' + at + (out !== src ? ' (갱신)' : ' (그대로)'));
