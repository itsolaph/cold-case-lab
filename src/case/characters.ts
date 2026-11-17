import type { Character } from './types';

/**
 * The four people in the interrogation room. Each sheet is the ONLY thing that
 * character's performer is ever shown (plus the shared public context), and the
 * pressure secrets are only sent once the detective has earned them.
 */

export const mara: Character = {
  id: 'mara',
  name: 'Mara Quill',
  shortName: 'Quill',
  initials: 'MQ',
  role: 'Night technician',
  kind: 'suspect',
  custodyNo: 'P-01',
  blurb: 'On shift 22:00 to 06:00. Reported the empty freezer.',
  voice:
    'Tired, precise, a little dry. Uses technical words for freezer kit. Sounds cooperative. ' +
    'Steers attention toward Dr Arden when she can, without ever accusing him outright.',
  greeting: "I've been up since yesterday afternoon, so ask what you need to ask.",
  open: [
    {
      id: 'm_shift',
      text: 'Mara Quill worked the 22:00 to 06:00 night shift: freezer checks, irrigation, environment logs.',
      says: "Nights, ten to six. Freezer checks, irrigation, environment logs. Same every night.",
      topic: [['shift', 'job', 'duties', 'work', 'routine', 'role', 'what do you do', 'who are you', 'tell me about yourself']],
    },
    {
      id: 'm_check',
      text: 'Says AL-07 was in its rack in the V2 freezer at her 22:15 routine check.',
      says: 'At my 22:15 check the AL-07 box was in its rack in the V2 freezer. I log it every night.',
      topic: [['22:15', 'last saw', 'last see', 'last time', 'still there', 'routine check', 'when did you see', 'was it there']],
    },
    {
      id: 'm_override',
      text: 'Technical staff hold a maintenance override PIN for the V2 vault door, meant for freezer alarms.',
      says:
        "Technicians have a maintenance override PIN for the vault door, for freezer alarms when the PIN pad plays up. Research staff don't get it.",
      topic: [['pin', 'override', 'who can open', 'access to the vault', 'vault access', 'get into the vault', 'vault door', 'open the vault']],
    },
    {
      id: 'm_coat',
      text: "Says Dr Arden's lab coat was still on the prep-room hook when her shift began.",
      says: "Felix's coat was still on the hook in the prep room when I came in. I noticed because he never leaves it.",
      topic: [['arden', 'felix', 'postdoc', 'coat', 'prep room', 'prep-room']],
    },
    {
      id: 'm_contract',
      text: "Mara Quill's contract ends next month, when the station's grant runs out.",
      says: "My contract ends next month along with the grant. So no, I'm not in love with this place right now.",
      topic: [['contract', 'future', 'money', 'pay', 'salary', 'leaving', 'fired', 'employ', 'debt', 'motive', 'grant']],
    },
    {
      id: 'm_report',
      text: 'Mara Quill found the V2 freezer rack empty at end-of-shift inventory and phoned it in at 05:52.',
      says: 'The rack was empty at the end-of-shift inventory. I rang it through to the booth at 05:52.',
      topic: [['discover', 'found it', 'find out', 'noticed', 'missing', 'inventory', '05:52', 'reported', 'report it', 'morning']],
    },
  ],
  claims: [
    {
      id: 'm_claims_east',
      text: 'Claims she was doing irrigation in the east potting houses from about 01:45 to 02:40.',
      says:
        'From about quarter to two until twenty to three I was in the east potting houses doing irrigation. Longest job of the night.',
      topic: [['where were you', 'whereabouts', 'alibi', 'at 2', 'at two', '02:', '01:', '2am', '2 am', 'around two', 'irrigation', 'between', 'during the night', 'at the time']],
    },
  ],
  pressures: [
    {
      id: 'mara_shipper',
      keywords: [['shipper', 'dewar', 'coldline', 'receipt', 'rental', 'rented', 'liquid nitrogen', 'ln2', '0148', '0388']],
      evidence: ['lab_phone_shop'],
      confrontation:
        'The Coldline Lab Supply number printed on the dry-shipper receipt called your phone at 18:41, eleven minutes before the rental was rung up.',
      hiddenTopic: 'what you did in town on the evening of the 14th, before your shift',
      reveals: [
        {
          id: 'm_crack_shipper',
          text: 'Admits she rented the Coldline dry shipper herself; says it was to take her own orchid cultures home before her contract ends.',
          says:
            "Fine. Yes, I rented it. My own orchid cultures. I wasn't going to leave them to be binned when the grant ends. That's all it was.",
        },
      ],
      bluffLine: "A receipt? There are receipts in every bin in this building. What has that got to do with me?",
    },
    {
      id: 'mara_west',
      keywords: [['west', 'w2', 'sector', 'cell', 'mast', 'tower', 'corridor light', 'hi-vis', 'hivis', 'high-vis']],
      evidence: ['lab_phone_cell', 'r_crack_light'],
      confrontation:
        'You were in the west wing, by vault V2, between 02:00 and 02:30, while you say you were in the east potting houses.',
      hiddenTopic: 'exactly where you were between 02:00 and 02:30',
      reveals: [
        {
          id: 'm_crack_west',
          text: 'Admits she was in the west wing near vault V2 around 02:10; says a freezer alarm called her there.',
          says:
            "All right. I went over to the west wing about ten past two. The V2 freezer alarm went, so I checked it. Nothing was wrong, so I didn't log it.",
        },
      ],
      bluffLine: "I've told you where I was. East houses, irrigation. Check the valve logs if you like.",
    },
  ],
  deflections: [
    'I log what I do. Ask me about the logs.',
    "I don't know what you want me to say to that.",
    "You'd have to ask someone else. I was working.",
  ],
  fallback: "Sorry, say that again? I've been on my feet since ten.",
};

export const felix: Character = {
  id: 'felix',
  name: 'Dr Felix Arden',
  shortName: 'Arden',
  initials: 'FA',
  role: 'Postdoctoral researcher',
  kind: 'suspect',
  custodyNo: 'P-02',
  blurb: 'Runs the AL-07 germination project. Grant renewal due.',
  voice:
    'Quick, defensive, a little self-important. Talks about his grant and his work. ' +
    'Embarrassed rather than guilty when cornered.',
  greeting: 'I want that seed lot found more than anyone. Ask me anything.',
  open: [
    {
      id: 'f_project',
      text: "Dr Felix Arden's germination project depends on AL-07; his grant renewal is due in six weeks.",
      says: 'AL-07 is my project. Germination trials. My renewal is due in six weeks, and without that seed lot there is no renewal.',
      topic: [['project', 'research', 'al-07', 'seed', 'lily', 'renewal', 'grant', 'work on', 'what do you do', 'who are you']],
    },
    {
      id: 'f_transfer',
      text: 'Asked the director to move AL-07 to a partner lab; the director refused last week.',
      says: "I asked the director to move AL-07 to a partner lab with better kit. She said no, last week. We argued. That isn't a crime.",
      topic: [['transfer', 'director', 'partner', 'argue', 'argument', 'move it', 'refused', 'motive', 'fight', 'angry']],
    },
    {
      id: 'f_no_override',
      text: 'Says research staff are never given the vault override PIN.',
      says: "I don't have the override PIN. Research staff never get it. I use my card and my own PIN like everyone else.",
      topic: [['pin', 'override', 'vault access', 'open the vault', 'vault door', 'get into the vault']],
    },
  ],
  claims: [
    {
      id: 'f_claims_left',
      text: 'Says he left at about 21:45 and was at home all night.',
      says: 'I left about quarter to ten and went home. I was home all night.',
      topic: [['when did you leave', 'left', 'leave', 'go home', 'went home', 'where were you', 'alibi', 'whereabouts', 'last night', 'evening', '21:']],
    },
  ],
  pressures: [
    {
      id: 'felix_badge',
      keywords: [['badge', 'card', '0193', 'swipe', 'exit button', 'request-to-exit', 'rex', 'keycard', 'lanyard']],
      evidence: ['lab_badge_override', 'lab_badge_card_inside'],
      confrontation:
        'Your card 0193 never left the building: you went out through the exit button at 21:47 with no card, and at 02:14 your card opened vault V2.',
      hiddenTopic: 'where your access badge was that night',
      reveals: [
        {
          id: 'f_crack_badge',
          text: "Admits he left his badge clipped to his lab coat on the prep-room hook and walked out through the exit button at 21:47. The prep room is the night technician's workstation.",
          says:
            "God. Fine. It was clipped to my coat, on the hook in the prep room, and I went out through the exit button. If the grant office hears I left a vault card lying around I'm finished. But I did not come back.",
        },
      ],
      bluffLine: 'I badged out like I always do. Check your log.',
    },
  ],
  deflections: [
    "I'm a scientist, not a security guard.",
    "I don't see what that has to do with the seed lot.",
    "Ask the night technician. She's the one who's here at night.",
  ],
  fallback: "Sorry, what? I didn't follow that.",
};

export const sol: Character = {
  id: 'sol',
  name: 'Sol Brennick',
  shortName: 'Brennick',
  initials: 'SB',
  role: 'Courier contractor',
  kind: 'suspect',
  custodyNo: 'P-03',
  blurb: 'Booked 23:30 drop at the west loading bay.',
  voice:
    'Laconic and practical, a contractor who wants to get back on the road. Short sentences. ' +
    'Gets defensive about rules he bent, not about the theft.',
  greeting: "I've got three drops this morning, so let's keep it moving.",
  open: [
    {
      id: 's_job',
      text: 'Sol Brennick had a booked 23:30 drop at the west loading bay: dry ice in, outgoing sample boxes out.',
      says: 'Booked drop, half eleven. Dry ice in, two sample boxes out. West loading bay, same as every week.',
      topic: [['job', 'delivery', 'drop', 'why were you', 'what were you doing', 'who are you', 'dry ice', 'booked', 'work']],
    },
    {
      id: 's_met',
      text: 'Says Mara Quill met him at the bay and signed for the drop at about 23:45.',
      says: 'The night tech met me at the bay and signed the docket, about quarter to twelve. Quill.',
      topic: [['who', 'signed', 'met', 'meet', 'see anyone', 'saw anyone', 'staff', 'docket', 'mara', 'quill', 'technician']],
    },
    {
      id: 's_hivis',
      text: 'A spare station hi-vis jacket, lettered HALDEN, hangs on a hook inside the west loading door.',
      says: "There's a spare station hi-vis on a hook inside the loading door. Mine's got the firm's name on it. That one says HALDEN.",
      topic: [['hi-vis', 'hivis', 'high-vis', 'jacket', 'vest', 'wearing', 'clothes', 'reflective']],
    },
  ],
  claims: [
    {
      id: 's_claims_left',
      text: 'Claims he was gone by midnight and never went past the bay door.',
      says: 'I was gone by midnight. Never went past the bay door.',
      topic: [['when did you leave', 'left', 'leave', 'midnight', 'how long', 'go inside', 'went inside', 'inside', 'gone', 'what time']],
    },
  ],
  pressures: [
    {
      id: 'sol_keypad',
      keywords: [['keypad', 'code', '23:38', '00:15', '00:19', 'quarter past', 'nap', 'slept', 'sleep', 'van', 'let yourself in', 'after midnight']],
      evidence: ['lab_badge_keypad', 'r_van', 'lab_phone_courier_left', 'lab_statement_courier'],
      confrontation:
        'Nobody opened the loading bay for you: you came in with the keypad code at 23:38, and your van was still at the bay until about 00:15.',
      hiddenTopic: 'how you got into the loading bay and how long you stayed',
      reveals: [
        {
          id: 's_crack_keypad',
          text: 'Admits he let himself in with the loading-bay keypad code, which the night technician gave him months ago, and dozed in his van until about 00:15.',
          says:
            "All right. I've got the bay code. The night tech gave it me months back so I wouldn't sit at the gate. And I had twenty minutes' kip in the van before the long drive. That's it.",
        },
        {
          id: 's_crack_offer',
          text: "Says that two weeks ago Mara Quill asked whether he would move a 'private cold-chain parcel, cash, no paperwork'. He refused.",
          says:
            "And since we're on her: two weeks back she asked if I'd take a private cold-chain parcel. Cash, no paperwork. I said no. I don't do that.",
        },
      ],
      bluffLine: "Gone by midnight. I've said.",
    },
  ],
  deflections: [
    "I drive. I don't know anything about seeds.",
    'Not my business what goes on inside.',
    "Couldn't tell you.",
  ],
  fallback: 'Say again? Long night.',
};

export const ruth: Character = {
  id: 'ruth',
  name: 'Ruth Okoye',
  shortName: 'Okoye',
  initials: 'RO',
  role: 'Security guard',
  kind: 'witness',
  custodyNo: 'W-01',
  blurb: 'Night guard in the gate booth. Wrote the statement.',
  voice:
    'Careful and formal, proud of her record. Speaks in report-like phrases. ' +
    'Ashamed rather than hostile when caught out.',
  greeting: 'I wrote it all down in my statement, but go ahead.',
  open: [
    {
      id: 'r_rounds',
      text: "Ruth Okoye's rounds run every two hours, at 22:00, 00:00, 02:00 and 04:00, through both wings.",
      says: 'Rounds every two hours. Ten, midnight, two, four. East side first, then through the west wing.',
      topic: [['rounds', 'patrol', 'schedule', 'duties', 'what do you do', 'who are you', 'routine', 'job']],
    },
    {
      id: 'r_van',
      text: "The courier's van stayed at the west loading bay until about 00:15.",
      says: "The courier's van was still at the bay till about quarter past twelve. I noted it.",
      topic: [['courier', 'van', 'brennick', 'sol', 'delivery', 'driver', 'loading bay']],
    },
    {
      id: 'r_receipt',
      text: 'Ruth Okoye found the Coldline receipt in the staff kitchen bin at 06:20 and bagged it.',
      says: "I found the receipt in the staff kitchen bin at twenty past six and bagged it for you. I didn't handle it more than I had to.",
      topic: [['receipt', 'bin', 'kitchen', 'coldline', 'rubbish', 'evidence', 'find anything', 'found anything']],
    },
    {
      id: 'r_report',
      text: 'Mara Quill phoned the theft through to the booth at 05:52.',
      says: 'Mara rang the booth at 05:52 and said the V2 freezer was empty.',
      topic: [['discover', 'reported', 'find out', 'found out', '05:52', 'how did you hear', 'who told', 'morning']],
    },
  ],
  claims: [
    {
      id: 'r_claims_round',
      text: 'Claims she did the 02:00 round and saw nothing unusual.',
      says: 'I did my two o\'clock round. Everything locked, nothing out of place.',
      topic: [['02:00', '2am', '2 am', "two o'clock", 'at two', 'see anything', 'saw anything', 'unusual', 'notice anything', 'suspicious', 'that night']],
    },
  ],
  pressures: [
    {
      id: 'ruth_call',
      keywords: [['phone call', 'call', 'on the phone', '41', '01:52', 'skip', 'skipped', 'missed', 'checkpoint', 'booth', "didn't do", 'did not do', 'never did']],
      evidence: ['lab_phone_guard_call', 'lab_badge_round_missing', 'lab_statement_round'],
      confrontation: 'The records say you never did the 02:00 round: you were on the phone in the booth.',
      hiddenTopic: 'what you were really doing at 02:00',
      reveals: [
        {
          id: 'r_crack_call',
          text: 'Admits she skipped the 02:00 round; she was on a long personal call in the booth.',
          says:
            "I didn't do the two o'clock. My sister was on the phone from the hospital and I wasn't going to hang up on her. I stayed in the booth.",
        },
        {
          id: 'r_crack_light',
          text: "From the booth she saw the west-wing corridor light come on at about 02:10, and a figure in the station's spare HALDEN hi-vis jacket.",
          says:
            "But I can see the west corridor from the booth. The light came on about ten past two. Someone in the station's spare hi-vis, the one with HALDEN on the back. I took it for Mara on her checks.",
        },
        {
          id: 'r_mara_asked',
          text: 'At about 01:30 Mara Quill came to the booth and asked what time her next round was.',
          says: 'And she had asked me, about half one, what time I was going round next. She never asks that.',
        },
      ],
      bluffLine: "I did my rounds. All four. It's in my statement.",
    },
  ],
  deflections: [
    "That's not something I'd have seen from my post.",
    'I put everything I saw in my statement.',
    'I can only tell you what I observed.',
  ],
  fallback: "I'm sorry, could you repeat the question?",
};

export const characters = [mara, felix, sol, ruth] as const;
