import type { Exhibit } from './types';

/** Handset / person words that let a phone-log request name everyone at once. */
const ALL_HANDSETS = ['every handset', 'all handsets', 'each handset', 'all phones', 'every phone', 'all five', 'everyone'];

export const phoneLog: Exhibit = {
  id: 'phone-log',
  code: 'E-1',
  title: 'Station handset log',
  kind: 'csv',
  file: 'exhibits/phone-log.csv',
  mimeType: 'text/csv',
  provenance: 'Carrier export, handsets H-01 to H-05, 14 Mar 18:00 to 15 Mar 07:00',
  size: '151 rows',
  truths: [
    {
      id: 'lab_phone_cell',
      text:
        'Handset H-02 (M. Quill) was served by sector HG-W2 from 02:02 until 02:32. HG-W2 covers the west wing, including seed vault V2 and the loading bay. The east potting houses are served by HG-E1.',
      asks: [
        ['mara', 'quill', 'technician', 'night tech', 'h-02', ...ALL_HANDSETS],
        ['cell', 'sector', 'mast', 'tower', 'location', 'where', 'position', 'west', 'east', 'moved', 'movement', 'whereabouts'],
      ],
    },
    {
      id: 'lab_phone_shop',
      text:
        'At 18:41 handset H-02 (M. Quill) received a 38-second call from 555-0148, the number printed on the Coldline Lab Supply receipt (Exhibit E-3).',
      asks: [
        ['mara', 'quill', 'technician', 'night tech', 'h-02', '555-0148', '0148', 'coldline', ...ALL_HANDSETS],
        ['calls', 'caller', 'incoming', 'contact', 'number', 'shop', 'coldline', '0148', 'receipt', 'who rang', 'who called', 'who phoned', 'evening', '18:'],
      ],
    },
    {
      id: 'lab_phone_guard_call',
      text:
        'Handset H-04 (guard desk, R. Okoye) was on one continuous 41-minute call from 01:52 to 02:33, on sector HG-E1. H-04 shows short west-wing visits around 22:05, 00:05 and 04:05, but none around 02:00.',
      asks: [
        ['guard', 'okoye', 'ruth', 'security', 'h-04', 'booth', 'desk', ...ALL_HANDSETS],
        ['call', 'duration', 'round', 'patrol', '01:', '02:', 'sector', 'cell', 'where', 'location', 'movement'],
      ],
    },
    {
      id: 'lab_phone_courier_left',
      text:
        'Handset H-03 (courier contractor, S. Brennick) was on HG-W2 from 23:34 and handed over to highway sector RTE-9 at 00:19. It stayed on road sectors for the rest of the night.',
      asks: [
        ['courier', 'brennick', 'sol', 'h-03', 'van', 'contractor', 'driver', ...ALL_HANDSETS],
        ['cell', 'sector', 'left', 'leave', 'location', 'where', 'when', 'moved', 'depart', 'movement'],
      ],
    },
    {
      id: 'lab_phone_arden_home',
      text:
        'Handset H-01 (F. Arden) left the station sectors at 21:49 and was on residential sector TWN-4 from 22:08 until the export ends at 07:00.',
      asks: [
        ['arden', 'felix', 'postdoc', 'h-01', ...ALL_HANDSETS],
        ['cell', 'sector', 'where', 'location', 'home', 'left', 'leave', 'moved', 'movement', 'whereabouts'],
      ],
    },
  ],
  vagueSummary:
    'Exhibit E-1 is an intact, unaltered carrier export: 151 events across five station handsets. The request names no handset, time window or property to test, so the lab can only certify the file. Re-submit with a person, a time and a question.',
};

export const badgeLog: Exhibit = {
  id: 'badge-log',
  code: 'E-2',
  title: 'Access-badge log',
  kind: 'log',
  file: 'exhibits/badge-log.txt',
  mimeType: 'text/plain',
  provenance: 'Door controller export, all readers, 14 Mar 17:00 to 15 Mar 07:00',
  size: '69 events',
  truths: [
    {
      id: 'lab_badge_override',
      text:
        'The 02:14 entry to vault V2 used card 0193 (registered to F. Arden) with auth mode 3, the maintenance PIN override. Override PINs are issued to technical staff only; research staff authenticate with mode 1, card plus personal PIN.',
      asks: [
        ['vault', 'v2', '02:14', '0193'],
        ['pin', 'override', 'auth', 'mode', 'how', 'method', 'credential', 'opened', 'code'],
      ],
    },
    {
      id: 'lab_badge_card_inside',
      text:
        "Card 0193 has no perimeter exit anywhere in the export; its last event before the vault entry is LAB-W1 at 20:31. The 21:47 main-door exit was a request-to-exit button press with no card, so the card stayed inside the building.",
      asks: [
        ['0193', 'arden', 'felix', 'postdoc', 'his card'],
        ['exit', 'left', 'leave', 'perimeter', 'out', 'main door', '21:47', 'rex', 'stayed', 'inside', 'last'],
      ],
    },
    {
      id: 'lab_badge_alarm_after',
      text:
        'The V2 freezer door-open alarm fired at 02:16, two minutes after the vault door opened at 02:14. No freezer alarm preceded the entry.',
      asks: [
        ['alarm', 'freezer'],
        ['before', 'after', 'order', 'sequence', 'first', 'time', 'when', 'trigger', 'cause', 'why'],
      ],
    },
    {
      id: 'lab_badge_keypad',
      text:
        'The west loading-bay door was opened from outside at 23:38 with the bay keypad code (auth mode K), not with a card and not by the guard.',
      asks: [
        ['loading', 'bay', 'keypad', 'courier', 'brennick', '23:3'],
        ['keypad', 'code', 'how', 'entry', 'enter', 'opened', 'who', 'access', 'let in', 'arriv'],
      ],
    },
    {
      id: 'lab_badge_loading_rex',
      text:
        'At 02:24 the west loading-bay door was opened from inside with the request-to-exit button and held for 47 seconds. No card or keypad was used.',
      asks: [
        ['loading', 'bay', 'dock'],
        ['02:', 'after midnight', 'overnight', 'from inside', 'rex', 'exit', 'later', 'night', 'out'],
      ],
    },
    {
      id: 'lab_badge_round_missing',
      text:
        'Guard tour checkpoints (card 0301) were logged around 22:00, 00:00 and 04:00. No checkpoint was logged between 01:00 and 03:30.',
      asks: [
        ['guard', 'round', 'patrol', 'checkpoint', 'tour', 'okoye', '0301'],
        ['02:00', '2 am', '2am', 'two', 'missing', 'skip', 'gap', 'every', 'all', 'each', 'logged', 'complete', 'when'],
      ],
    },
  ],
  vagueSummary:
    'Exhibit E-2 is a complete door-controller export: 69 events, no gaps in the sequence counter, clock drift under one second. Without a door, card or time to examine, the lab has no finding to certify.',
};

export const receipt: Exhibit = {
  id: 'receipt',
  code: 'E-3',
  title: 'Receipt from the kitchen bin',
  kind: 'image',
  file: 'exhibits/receipt.png',
  mimeType: 'image/png',
  provenance: 'Recovered from the staff kitchen bin by R. Okoye, 15 Mar 06:20',
  size: 'Photo, 1 page',
  alt: 'Photograph of a creased thermal receipt from Coldline Lab Supply lying on a light table next to an evidence scale.',
  truths: [
    {
      id: 'lab_receipt_shipper',
      text:
        'The receipt is for a one-day rental of a CX-1 vapour-phase dry shipper, charged with 3.6 L of liquid nitrogen. A charged dry shipper stays below -150 °C for days: it is the equipment needed to move a cryo-stored seed lot without killing it.',
      asks: [['item', 'bought', 'buy', 'purchas', 'rent', 'shipper', 'dewar', 'product', 'equipment', 'goods', 'line', 'sold', 'contents', 'paid for', 'cryo', 'nitrogen', 'what was']],
    },
    {
      id: 'lab_receipt_time',
      text: 'Issued at 18:52 on 14 March, the evening of the theft. The shipper was due back by 10:00 on 15 March.',
      asks: [['time', 'date', 'when', 'issued', 'timestamp', 'hour', 'return', 'due']],
    },
    {
      id: 'lab_receipt_contact',
      text: "The receipt prints the shop's number, 555-0148, and the payment line: card ending 0388, approved.",
      asks: [['phone', 'number', 'card', 'paid', 'payment', 'contact', 'telephone', 'who', 'buyer', 'customer']],
    },
  ],
  vagueSummary:
    'Exhibit E-3 is a thermal till receipt, creased, partly faded at the folds, no fingerprints recoverable from thermal paper. The request does not say what to read or test on it, so no finding is certified.',
};

export const statement: Exhibit = {
  id: 'statement',
  code: 'E-4',
  title: "Guard's written statement",
  kind: 'document',
  file: 'exhibits/witness-statement.txt',
  mimeType: 'text/plain',
  provenance: 'Written and signed by R. Okoye at the booth, 15 Mar 07:10',
  size: '2 pages',
  truths: [
    {
      id: 'lab_statement_courier',
      text:
        "The statement's times for the courier hang together: van arrives 23:35, figure at the bay 23:45, van gone about 00:15. Nothing in the document places the courier inside the building.",
      asks: [
        ['courier', 'brennick', 'sol', 'van', 'hi-vis', 'figure', 'driver'],
        ['time', 'consistent', 'when', 'after', 'inside', 'timeline', 'account', 'true', 'reliab', 'credib', 'accura'],
      ],
    },
    {
      id: 'lab_statement_round',
      text:
        'The 02:00 round is one generic sentence, while the 22:00, 00:00 and 04:00 rounds each list doors and times. The 02:00 entry reads as reconstructed, not observed.',
      asks: [
        ['round', 'patrol', '02:00', "two o'clock", '2 am', '2am', 'tour'],
        ['consistent', 'detail', 'true', 'credib', 'reliab', 'accura', 'compare', 'differ', 'honest', 'lie', 'lying', 'check', 'invent'],
      ],
    },
  ],
  vagueSummary:
    "Exhibit E-4 is a two-page handwritten statement, signed and timed 07:10. Ink and pagination are consistent with a single sitting. The request does not name a passage or a claim to test, so the lab has nothing to certify beyond the statement's integrity.",
};

export const exhibits = [phoneLog, badgeLog, receipt, statement] as const;
