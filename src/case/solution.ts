import type { Solution } from './types';

/**
 * The authored solution. Only deterministic code reads this file
 * (`src/game/accuse.ts` and the result screen). It is never put in a prompt.
 */
export const solution: Solution = {
  culprit: 'mara',
  means: ['lab_badge_override', 'lab_receipt_shipper'],
  opportunity: ['lab_phone_cell'],
  narrative: [
    "Mara Quill took AL-07. Her contract was ending with the grant, and a private buyer wanted the last viable Ashfall lily seed. Two weeks earlier she had sounded out the courier about a cash cold-chain run. He said no.",
    'At 18:52 she rented a vapour-phase dry shipper from Coldline Lab Supply, the only way to keep a cryo-stored seed lot alive outside the vault. The shop had called her phone at 18:41 to say it was ready.',
    "Dr Arden left his badge clipped to his coat in the prep room, which is her workstation. At 02:14 she opened vault V2 with his card and her own technician's override PIN, so the log would show his name.",
    "She had asked the guard when her next round was, and waited until the guard was on a long call. Her handset sat on the west-wing sector from 02:02 until 02:32 while she claimed to be in the east potting houses. The freezer alarm fired two minutes after the door opened, not before. At 02:24 the loading-bay door opened from inside for 47 seconds: the shipper went out to her car.",
    "The receipt in the kitchen bin was her mistake. The courier's keypad code and late nap, Dr Arden's row with the director, and the guard's tidy statement were all true, and all beside the point.",
  ],
};
