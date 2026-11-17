// Generates the two log exhibits deterministically:
//   public/exhibits/phone-log.csv  (carrier export, station handsets)
//   public/exhibits/badge-log.txt  (door controller export)
// The story events are fixed; the background noise comes from a seeded PRNG,
// so re-running the script produces byte-identical files.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'exhibits');
mkdirSync(out, { recursive: true });

// --- seeded PRNG (mulberry32) ------------------------------------------------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(417);

// Times are minutes from 14 Mar 00:00; 15 Mar 00:00 = 1440.
const T = (hhmm, day = 14) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (day === 15 ? 1440 : 0) + h * 60 + m;
};
const stamp = (min, sec = 0) => {
  const day = min >= 1440 ? 15 : 14;
  const m = min % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return { iso: `2026-03-${day}T${hh}:${mm}:${ss}`, short: `03-${day} ${hh}:${mm}:${ss}` };
};

// =============================================================================
// PHONE LOG
// =============================================================================
const holders = {
  'H-01': 'F. Arden',
  'H-02': 'M. Quill',
  'H-03': 'S. Brennick (contractor)',
  'H-04': 'Guard desk (R. Okoye)',
  'H-05': 'D. Lind',
};

// Cell segments per handset: [startMinute, cell]. A LOCUPD row is written at
// every change, and a periodic LOCUPD every 60 minutes while stationary.
const segments = {
  'H-01': [
    [T('18:00'), 'HG-W2'],
    [T('21:41'), 'HG-E1'],
    [T('21:49'), 'RTE-2'],
    [T('22:08'), 'TWN-4'],
  ],
  'H-02': [
    [T('18:00'), 'TWN-2'],
    [T('18:47'), 'TWN-7'],
    [T('19:06'), 'TWN-2'],
    [T('21:27'), 'RTE-2'],
    [T('21:45'), 'HG-E1'],
    [T('22:12'), 'HG-W2'],
    [T('22:25'), 'HG-E1'],
    [T('23:36'), 'HG-W2'],
    [T('23:58'), 'HG-E1'],
    [T('02:02', 15), 'HG-W2'],
    [T('02:32', 15), 'HG-E1'],
    [T('05:45', 15), 'HG-W2'],
    [T('05:56', 15), 'HG-E1'],
  ],
  'H-03': [
    [T('18:00'), 'RTE-4'],
    [T('20:15'), 'TWN-9'],
    [T('21:50'), 'RTE-4'],
    [T('22:58'), 'RTE-9'],
    [T('23:34'), 'HG-W2'],
    [T('00:19', 15), 'RTE-9'],
    [T('01:37', 15), 'RTE-11'],
    [T('03:10', 15), 'RTE-14'],
    [T('05:20', 15), 'TWN-9'],
  ],
  'H-04': [
    [T('18:00'), 'HG-E1'],
    [T('22:05'), 'HG-W2'],
    [T('22:10'), 'HG-E1'],
    [T('00:05', 15), 'HG-W2'],
    [T('00:10', 15), 'HG-E1'],
    [T('04:05', 15), 'HG-W2'],
    [T('04:10', 15), 'HG-E1'],
  ],
  'H-05': [
    [T('18:00'), 'TWN-1'],
    [T('06:22', 15), 'RTE-2'],
    [T('06:38', 15), 'HG-E1'],
  ],
};

const END = T('07:00', 15);
const START = T('18:00');
const rows = [];
const push = (min, sec, handset, direction, type, counterpart, duration, cell) =>
  rows.push({ min, sec, handset, direction, type, counterpart, duration, cell });

function cellAt(handset, min) {
  let cell = segments[handset][0][1];
  for (const [s, c] of segments[handset]) if (s <= min) cell = c;
  return cell;
}

// location updates
for (const [handset, segs] of Object.entries(segments)) {
  segs.forEach(([s, c], i) => {
    const next = i + 1 < segs.length ? segs[i + 1][0] : END;
    push(s, Math.floor(rand() * 50) + 5, handset, '-', 'LOCUPD', '-', 0, c);
    for (let p = s + 60; p < next - 8; p += 60) {
      push(p, Math.floor(rand() * 50) + 5, handset, '-', 'LOCUPD', '-', 0, c);
    }
  });
}

// story events ----------------------------------------------------------------
const ev = (hhmm, day, sec, handset, direction, type, counterpart, duration) => {
  const min = T(hhmm, day);
  push(min, sec, handset, direction, type, counterpart, duration, cellAt(handset, min));
};
// Arden: evening calls with the partner lab, then home
ev('18:22', 14, 4, 'H-01', 'OUT', 'VOICE', '555-0172', 312);
ev('19:47', 14, 31, 'H-01', 'IN', 'VOICE', '555-0172', 95);
ev('20:58', 14, 12, 'H-01', 'OUT', 'SMS', '555-0109', 0);
ev('21:02', 14, 40, 'H-01', 'IN', 'SMS', '555-0109', 0);
ev('22:31', 14, 2, 'H-01', 'OUT', 'SMS', '555-0131', 0);
ev('23:14', 14, 55, 'H-01', 'IN', 'SMS', '555-0131', 0);
// Quill: the shop calls, she goes to town, then to work
ev('18:41', 14, 7, 'H-02', 'IN', 'VOICE', '555-0148', 38);
ev('19:12', 14, 20, 'H-02', 'OUT', 'SMS', '555-0163', 0);
ev('19:30', 14, 3, 'H-02', 'IN', 'SMS', '555-0163', 0);
ev('23:33', 14, 48, 'H-02', 'IN', 'SMS', 'H-03', 0);
ev('02:29', 15, 11, 'H-02', 'OUT', 'SMS', '555-0163', 0);
ev('02:36', 15, 52, 'H-02', 'IN', 'SMS', '555-0163', 0);
ev('05:52', 15, 4, 'H-02', 'OUT', 'VOICE', 'H-04', 64);
// Brennick: dispatch and custody scans
ev('22:50', 14, 18, 'H-03', 'OUT', 'VOICE', '555-0120', 71);
ev('23:33', 14, 40, 'H-03', 'OUT', 'SMS', 'H-02', 0);
ev('23:47', 14, 9, 'H-03', 'OUT', 'DATA', 'custody.scan', 14);
ev('23:52', 14, 26, 'H-03', 'OUT', 'DATA', 'custody.scan', 12);
ev('00:41', 15, 33, 'H-03', 'OUT', 'VOICE', '555-0120', 48);
ev('03:55', 15, 15, 'H-03', 'IN', 'VOICE', '555-0120', 36);
ev('05:31', 15, 2, 'H-03', 'OUT', 'DATA', 'custody.scan', 11);
// Okoye: the long call, the theft report, calling the director
ev('01:52', 15, 17, 'H-04', 'IN', 'VOICE', '555-0187', 2460);
ev('05:52', 15, 4, 'H-04', 'IN', 'VOICE', 'H-02', 64);
ev('05:58', 15, 30, 'H-04', 'OUT', 'VOICE', 'H-05', 142);
// Lind: director
ev('21:40', 14, 50, 'H-05', 'IN', 'SMS', '555-0109', 0);
ev('05:58', 15, 30, 'H-05', 'IN', 'VOICE', 'H-04', 142);
ev('06:05', 15, 10, 'H-05', 'OUT', 'VOICE', 'H-01', 96);
ev('06:05', 15, 10, 'H-01', 'IN', 'VOICE', 'H-05', 96);

// background noise: data sessions spread across handsets -----------------------
const noisePlan = { 'H-01': 10, 'H-02': 9, 'H-03': 8, 'H-04': 10, 'H-05': 7 };
for (const [handset, n] of Object.entries(noisePlan)) {
  for (let i = 0; i < n; i++) {
    const min = START + Math.floor(rand() * (END - START - 10));
    // keep the story windows readable: no noise on H-02 between 01:50 and 02:40
    if (handset === 'H-02' && min > T('01:50', 15) && min < T('02:40', 15)) continue;
    if (handset === 'H-04' && min > T('01:50', 15) && min < T('02:35', 15)) continue;
    const dur = 20 + Math.floor(rand() * 400);
    push(min, Math.floor(rand() * 59), handset, 'OUT', 'DATA', 'apn.station', dur, cellAt(handset, min));
  }
}

rows.sort((a, b) => a.min - b.min || a.sec - b.sec || a.handset.localeCompare(b.handset));
const csv = ['timestamp,handset,holder,direction,type,counterpart,duration_s,cell'];
for (const r of rows) {
  csv.push(
    [stamp(r.min, r.sec).iso, r.handset, `"${holders[r.handset]}"`, r.direction, r.type, r.counterpart, r.duration, r.cell].join(','),
  );
}
writeFileSync(join(out, 'phone-log.csv'), csv.join('\n') + '\n');
console.log(`phone-log.csv: ${rows.length} rows`);

// =============================================================================
// BADGE LOG
// =============================================================================
// auth: 1 card+PIN, 2 card only, 3 maintenance PIN override, K bay keypad, 0 no credential
const cards = {
  '0101': 'D. Lind',
  '0112': 'P. Sato',
  '0145': 'J. Mercer',
  '0158': 'H. Vey',
  '0170': 'A. Wren',
  '0193': 'F. Arden',
  '0207': 'M. Quill',
  '0301': 'R. Okoye',
};
const badge = [];
const b = (hhmm, day, sec, reader, card, event, auth) =>
  badge.push({ min: T(hhmm, day), sec, reader, card, holder: card === '----' ? '' : cards[card], event, auth });

// day staff leaving
b('17:04', 14, 12, 'MAIN-DOOR', '0112', 'EXIT', '2');
b('17:11', 14, 40, 'LAB-W1', '0145', 'GRANTED', '2');
b('17:26', 14, 3, 'MAIN-DOOR', '0158', 'EXIT', '2');
b('17:39', 14, 51, 'MAIN-DOOR', '0145', 'EXIT', '2');
b('17:58', 14, 20, 'PREP-ROOM', '0193', 'GRANTED', '2');
b('18:05', 14, 9, 'LAB-W1', '0193', 'GRANTED', '2');
b('18:14', 14, 33, 'MAIN-DOOR', '0170', 'EXIT', '2');
b('18:30', 14, 2, 'PREP-ROOM', '0101', 'GRANTED', '2');
b('18:46', 14, 58, 'MAIN-DOOR', '0101', 'EXIT', '2');
b('19:10', 14, 14, 'PREP-ROOM', '0193', 'GRANTED', '2');
b('19:12', 14, 40, 'LAB-W1', '0193', 'GRANTED', '2');
b('19:55', 14, 21, 'BOOTH', '0301', 'GRANTED', '2');
b('20:31', 14, 6, 'LAB-W1', '0193', 'GRANTED', '2');
b('21:47', 14, 12, 'MAIN-DOOR', '----', 'REX-EXIT', '0');
// night technician arrives
b('21:51', 14, 30, 'MAIN-DOOR', '0207', 'GRANTED', '1');
b('21:53', 14, 2, 'PREP-ROOM', '0207', 'GRANTED', '2');
// guard round 22:00
b('22:02', 14, 11, 'CP-EAST', '0301', 'CHECKPOINT', '2');
b('22:05', 14, 47, 'W-CORRIDOR', '0301', 'GRANTED', '2');
b('22:07', 14, 5, 'CP-WEST', '0301', 'CHECKPOINT', '2');
b('22:11', 14, 39, 'BOOTH', '0301', 'GRANTED', '2');
// routine vault check
b('22:12', 14, 50, 'W-CORRIDOR', '0207', 'GRANTED', '2');
b('22:15', 14, 4, 'V2-VAULT', '0207', 'GRANTED', '1');
b('22:15', 14, 31, 'V2-FREEZER', '----', 'DOOR-OPEN', '-');
b('22:15', 14, 58, 'V2-FREEZER', '----', 'DOOR-CLOSED', '-');
b('22:17', 14, 20, 'V2-VAULT', '----', 'DOOR-CLOSED', '-');
b('22:24', 14, 44, 'PREP-ROOM', '0207', 'GRANTED', '2');
b('22:58', 14, 10, 'PREP-ROOM', '0207', 'GRANTED', '2');
// courier
b('23:36', 14, 15, 'W-CORRIDOR', '0207', 'GRANTED', '2');
b('23:38', 14, 2, 'LOADING-BAY', '----', 'GRANTED', 'K');
b('23:38', 14, 50, 'LOADING-BAY', '----', 'DOOR-CLOSED', '-');
b('23:55', 14, 21, 'LOADING-BAY', '----', 'REX-EXIT', '0');
b('23:55', 14, 49, 'LOADING-BAY', '----', 'DOOR-CLOSED', '-');
b('23:59', 14, 3, 'PREP-ROOM', '0207', 'GRANTED', '2');
// guard round 00:00
b('00:02', 15, 40, 'CP-EAST', '0301', 'CHECKPOINT', '2');
b('00:05', 15, 18, 'W-CORRIDOR', '0301', 'GRANTED', '2');
b('00:06', 15, 52, 'CP-WEST', '0301', 'CHECKPOINT', '2');
b('00:12', 15, 8, 'BOOTH', '0301', 'GRANTED', '2');
b('00:47', 15, 29, 'PREP-ROOM', '0207', 'GRANTED', '2');
b('01:22', 15, 5, 'PREP-ROOM', '0207', 'GRANTED', '2');
b('01:36', 15, 41, 'BOOTH', '0301', 'GRANTED', '2');
// the theft
b('02:03', 15, 9, 'W-CORRIDOR', '0193', 'GRANTED', '2');
b('02:14', 15, 26, 'V2-VAULT', '0193', 'GRANTED', '3');
b('02:15', 15, 2, 'V2-FREEZER', '----', 'DOOR-OPEN', '-');
b('02:16', 15, 4, 'V2-FREEZER', '----', 'ALARM', '-');
b('02:17', 15, 31, 'V2-FREEZER', '----', 'ALARM-ACK', '3');
b('02:17', 15, 40, 'V2-FREEZER', '----', 'DOOR-CLOSED', '-');
b('02:19', 15, 13, 'V2-VAULT', '----', 'DOOR-CLOSED', '-');
b('02:24', 15, 7, 'LOADING-BAY', '----', 'REX-EXIT', '0');
b('02:24', 15, 54, 'LOADING-BAY', '----', 'DOOR-CLOSED', '-');
b('02:33', 15, 46, 'PREP-ROOM', '0207', 'GRANTED', '2');
b('03:12', 15, 18, 'PREP-ROOM', '0207', 'GRANTED', '2');
// guard round 04:00
b('04:02', 15, 25, 'CP-EAST', '0301', 'CHECKPOINT', '2');
b('04:05', 15, 3, 'W-CORRIDOR', '0301', 'GRANTED', '2');
b('04:06', 15, 41, 'CP-WEST', '0301', 'CHECKPOINT', '2');
b('04:11', 15, 30, 'BOOTH', '0301', 'GRANTED', '2');
b('04:38', 15, 12, 'PREP-ROOM', '0207', 'GRANTED', '2');
// end of shift inventory and discovery
b('05:46', 15, 1, 'W-CORRIDOR', '0207', 'GRANTED', '2');
b('05:48', 15, 37, 'V2-VAULT', '0207', 'GRANTED', '1');
b('05:49', 15, 2, 'V2-FREEZER', '----', 'DOOR-OPEN', '-');
b('05:50', 15, 19, 'V2-FREEZER', '----', 'DOOR-CLOSED', '-');
b('05:51', 15, 40, 'V2-VAULT', '----', 'DOOR-CLOSED', '-');
b('05:56', 15, 22, 'PREP-ROOM', '0207', 'GRANTED', '2');
b('06:01', 15, 50, 'W-CORRIDOR', '0301', 'GRANTED', '2');
b('06:03', 15, 14, 'V2-VAULT', '0301', 'DENIED', '1');
b('06:09', 15, 33, 'BOOTH', '0301', 'GRANTED', '2');
b('06:38', 15, 45, 'MAIN-DOOR', '0101', 'GRANTED', '1');
b('06:41', 15, 6, 'W-CORRIDOR', '0101', 'GRANTED', '2');
b('06:42', 15, 30, 'V2-VAULT', '0101', 'GRANTED', '1');
b('06:52', 15, 40, 'MAIN-DOOR', '----', 'GRANTED', 'G');

badge.sort((x, y) => x.min - y.min || x.sec - y.sec);
const pad = (s, n) => String(s).padEnd(n, ' ');
const lines = [
  'HALDEN GLASSHOUSE STATION  /  DOOR CONTROLLER EXPORT',
  'controller: DC-2  firmware 4.11  range: 2026-03-14 17:00 .. 2026-03-15 07:00  events: ' + badge.length,
  '',
  pad('seq', 6) + pad('time', 17) + pad('reader', 13) + pad('card', 6) + pad('holder', 11) + pad('event', 12) + 'auth',
  '-'.repeat(70),
];
badge.forEach((e, i) => {
  lines.push(
    pad(String(4180 + i).padStart(5, '0'), 6) +
      pad(stamp(e.min, e.sec).short, 17) +
      pad(e.reader, 13) +
      pad(e.card, 6) +
      pad(e.holder || '-', 11) +
      pad(e.event, 12) +
      e.auth,
  );
});
lines.push('-'.repeat(70), 'end of export');
writeFileSync(join(out, 'badge-log.txt'), lines.join('\n') + '\n');
console.log(`badge-log.txt: ${badge.length} events`);
