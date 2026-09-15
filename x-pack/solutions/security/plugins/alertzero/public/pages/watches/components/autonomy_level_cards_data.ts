/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  type WatchAutonomyLevel,
} from '@kbn/alertzero-common';

/** Pill actors inside level-card fact values. */
export type LevelCardActor = 'you' | 'worker';

export type LevelCardFactPart =
  | { kind: 'pill'; actor: LevelCardActor }
  | { kind: 'text'; text: string };

export interface LevelCardFact {
  /** Sentence-case fact label (same size as value; rendered semibold). */
  label: string;
  parts: LevelCardFactPart[];
}

export interface AutonomyLevelCard {
  level: WatchAutonomyLevel;
  /** One-sentence "who" summary under the level name. */
  who: string;
  facts: LevelCardFact[];
}

export interface AutonomyLevelCardsCopy {
  /** Optional subdued line under the Autonomy label. */
  intro?: string;
  levels: AutonomyLevelCard[];
}

const pill = (actor: LevelCardActor): LevelCardFactPart => ({ kind: 'pill', actor });
const text = (t: string): LevelCardFactPart => ({ kind: 'text', text: t });

const actorLabel = (actor: LevelCardActor): string =>
  actor === 'you'
    ? i18n.translate('xpack.alertzero.watches.settings.autonomyCards.actorYou', {
        defaultMessage: 'You',
      })
    : i18n.translate('xpack.alertzero.watches.settings.autonomyCards.actorWorker', {
        defaultMessage: 'Worker',
      });

/** Resolves pill parts to plain text for aria-labels and tests. */
export const factPartsToText = (parts: LevelCardFactPart[]): string =>
  parts.map((part) => (part.kind === 'pill' ? actorLabel(part.actor) : part.text)).join('');

/** Supervised-only warning shown under the cards at the highest level. */
const supervisedWarn = (workerName: string): string =>
  i18n.translate('xpack.alertzero.watches.settings.autonomyCards.supervisedWarn', {
    defaultMessage:
      'Highest level: {workerName} takes real actions on its own. Analysts review after the fact and can reverse.',
    values: { workerName },
  });

/**
 * Consequence-forward level cards per Worker, ported from the Sep 11 prototype
 * (notdaybreak_mvp workerAutonomyLevelCards.ts). Copy describes what each
 * level does for THIS Worker — not a generic autonomy definition.
 */
const AUTONOMY_LEVEL_CARDS: Record<string, AutonomyLevelCardsCopy> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: {
    intro: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.intro', {
      defaultMessage: 'This Worker supports Manual and Supervised.',
    }),
    levels: [
      {
        level: 'manual',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.manual.who',
          {
            defaultMessage:
              'Runs only when a person starts it. Investigations are drafted for review.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.manual.runs',
              { defaultMessage: 'Runs' }
            ),
            parts: [pill('you'), text(' click Run')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.manual.investigations',
              { defaultMessage: 'Investigations' }
            ),
            parts: [text('drafted for your review')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.manual.youHear',
              { defaultMessage: 'You hear' }
            ),
            parts: [text('when you open the run')],
          },
        ],
      },
      {
        level: 'supervised',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.supervised.who',
          {
            defaultMessage: 'Handles the attack lifecycle within policy. You review afterwards.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.supervised.runs',
              { defaultMessage: 'Runs' }
            ),
            parts: [pill('worker'), text(' on schedule')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.supervised.investigations',
              { defaultMessage: 'Investigations' }
            ),
            parts: [pill('worker'), text(' opens & progresses')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.supervised.youHear',
              { defaultMessage: 'You hear' }
            ),
            parts: [text('after, in the queue')],
          },
        ],
      },
    ],
  },
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: {
    intro: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.alertTriage.intro', {
      defaultMessage:
        'It always analyzes and classifies alert batches; the level decides who closes false positives.',
    }),
    levels: [
      {
        level: 'manual',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.alertTriage.manual.who',
          {
            defaultMessage: 'Analyzes every batch; every closure waits for you.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.manual.classifies',
              { defaultMessage: 'Classifies' }
            ),
            parts: [pill('worker'), text(' every batch')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.manual.closes',
              { defaultMessage: 'Closes false positives' }
            ),
            parts: [pill('you'), text(' approve each')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.manual.youHear',
              { defaultMessage: 'You hear' }
            ),
            parts: [text('when a closure awaits you')],
          },
        ],
      },
      {
        level: 'assisted',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.alertTriage.assisted.who',
          {
            defaultMessage:
              'Closes false positives automatically at or above the confidence score.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.assisted.classifies',
              { defaultMessage: 'Classifies' }
            ),
            parts: [pill('worker'), text(' every batch')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.assisted.closes',
              { defaultMessage: 'Closes false positives' }
            ),
            parts: [pill('worker'), text(' above the confidence score')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.assisted.youHear',
              { defaultMessage: 'You hear' }
            ),
            parts: [text('after closing, in the queue')],
          },
        ],
      },
      {
        level: 'supervised',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.alertTriage.supervised.who',
          {
            defaultMessage:
              'Closes false positives automatically — same as Assisted for this Worker.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.supervised.classifies',
              { defaultMessage: 'Classifies' }
            ),
            parts: [pill('worker'), text(' every batch')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.supervised.closes',
              { defaultMessage: 'Closes false positives' }
            ),
            parts: [pill('worker'), text(' above the confidence score')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.supervised.youHear',
              { defaultMessage: 'You hear' }
            ),
            parts: [text('after closing, in the queue')],
          },
        ],
      },
    ],
  },
  [SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID]: {
    intro: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.threatHunt.intro', {
      defaultMessage:
        'It always hunts and gathers evidence; the level decides who drafts actions and who runs them.',
    }),
    levels: [
      {
        level: 'manual',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.threatHunt.manual.who',
          {
            defaultMessage: 'Hunts only when a person starts it. Proposals are drafted for review.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.manual.runs',
              { defaultMessage: 'Runs' }
            ),
            parts: [pill('you'), text(' click Run')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.manual.proposals',
              { defaultMessage: 'Proposals' }
            ),
            parts: [text('drafted for your review')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.manual.youHear',
              { defaultMessage: 'You hear' }
            ),
            parts: [text('when you open the run')],
          },
        ],
      },
      {
        level: 'assisted',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.threatHunt.assisted.who',
          {
            defaultMessage: 'Hunts on schedule; Proposals wait for you.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.assisted.runs',
              { defaultMessage: 'Runs' }
            ),
            parts: [pill('worker'), text(' on schedule')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.assisted.proposals',
              { defaultMessage: 'Proposals' }
            ),
            parts: [pill('you'), text(' approve each')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.assisted.youHear',
              { defaultMessage: 'You hear' }
            ),
            parts: [text('when a Proposal awaits you')],
          },
        ],
      },
      {
        level: 'supervised',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.threatHunt.supervised.who',
          {
            defaultMessage: 'Handles the hunt lifecycle within policy. You review afterwards.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.supervised.runs',
              { defaultMessage: 'Runs' }
            ),
            parts: [pill('worker'), text(' on schedule')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.supervised.proposals',
              { defaultMessage: 'Proposals' }
            ),
            parts: [pill('worker'), text(' progresses them')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.supervised.youHear',
              { defaultMessage: 'You hear' }
            ),
            parts: [text('after, in the queue')],
          },
        ],
      },
    ],
  },
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: {
    intro: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.ruleTuning.intro', {
      defaultMessage: 'This Worker supports Manual and Assisted.',
    }),
    levels: [
      {
        level: 'manual',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.manual.who',
          {
            defaultMessage:
              'Analyzes only when a person starts it. Proposals wait for your review.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.manual.runs',
              { defaultMessage: 'Runs' }
            ),
            parts: [pill('you'), text(' click Run')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.manual.ruleChanges',
              { defaultMessage: 'Rule changes' }
            ),
            parts: [pill('you'), text(' apply them')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.manual.youHear',
              { defaultMessage: 'You hear' }
            ),
            parts: [text('when a proposal is ready')],
          },
        ],
      },
      {
        level: 'assisted',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.assisted.who',
          {
            defaultMessage: 'Analyzes on schedule; every change waits for you.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.assisted.runs',
              { defaultMessage: 'Runs' }
            ),
            parts: [pill('worker'), text(' on schedule')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.assisted.ruleChanges',
              { defaultMessage: 'Rule changes' }
            ),
            parts: [pill('you'), text(' approve each')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.assisted.youHear',
              { defaultMessage: 'You hear' }
            ),
            parts: [text('when a proposal awaits you')],
          },
        ],
      },
    ],
  },
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID]: {
    intro: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.ruleCreation.intro', {
      defaultMessage: 'This Worker supports Manual and Assisted.',
    }),
    levels: [
      {
        level: 'manual',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.ruleCreation.manual.who',
          {
            defaultMessage: 'Drafts only when a person starts it.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCreation.manual.runs',
              { defaultMessage: 'Runs' }
            ),
            parts: [pill('you'), text(' click Run')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCreation.manual.newRules',
              { defaultMessage: 'New rules' }
            ),
            parts: [pill('you'), text(' install or enable')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCreation.manual.youHear',
              { defaultMessage: 'You hear' }
            ),
            parts: [text('when drafts are ready')],
          },
        ],
      },
      {
        level: 'assisted',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.ruleCreation.assisted.who',
          {
            defaultMessage: 'Drafts on schedule; every rule waits for you.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCreation.assisted.runs',
              { defaultMessage: 'Runs' }
            ),
            parts: [pill('worker'), text(' on schedule')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCreation.assisted.newRules',
              { defaultMessage: 'New rules' }
            ),
            parts: [pill('you'), text(' approve each')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCreation.assisted.youHear',
              { defaultMessage: 'You hear' }
            ),
            parts: [text('when a draft awaits you')],
          },
        ],
      },
    ],
  },
};

/**
 * Autonomy levels a Worker's control offers, in ascending order. A Worker whose
 * persisted level is not in its list renders clamped to its highest level.
 */
export const AUTONOMY_OPTIONS_BY_WORKER: Record<string, readonly WatchAutonomyLevel[]> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: ['manual', 'supervised'],
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: ['manual', 'assisted', 'supervised'],
  [SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID]: ['manual', 'assisted', 'supervised'],
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: ['manual', 'assisted'],
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID]: ['manual', 'assisted'],
};

const AUTONOMY_LEVEL_ORDER: readonly WatchAutonomyLevel[] = ['manual', 'assisted', 'supervised'];

/** Generic one-line "who" for Workers without card copy — mirrors the descriptions in the slider. */
const AUTONOMY_LEVEL_WHO: Record<WatchAutonomyLevel, string> = {
  manual: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.genericManual', {
    defaultMessage: 'Nothing runs on its own; every proposal waits for your review.',
  }),
  assisted: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.genericAssisted', {
    defaultMessage: 'Routine, reversible steps run on their own; consequential changes wait.',
  }),
  supervised: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.genericSupervised', {
    defaultMessage: 'Acts within its allow-list and tells you afterwards.',
  }),
};

export const autonomyOptionsForWorker = (workerId: string): readonly WatchAutonomyLevel[] =>
  AUTONOMY_OPTIONS_BY_WORKER[workerId] ?? AUTONOMY_LEVEL_ORDER;

/**
 * Clamps a persisted level onto a Worker's offered levels: unknown or withheld
 * levels fall back to the Worker's highest offered level (the conservative
 * reading of a stored out-of-list value is the closest offered neighbour, and
 * the highest offered level is what the old three-tick control wrote last).
 */
export const clampAutonomyToOptions = (
  workerId: string,
  level: WatchAutonomyLevel
): WatchAutonomyLevel => {
  const options = autonomyOptionsForWorker(workerId);
  return options.includes(level) ? level : options[options.length - 1];
};

export const getAutonomyLevelCards = (workerId: string): AutonomyLevelCardsCopy => {
  const allowed = autonomyOptionsForWorker(workerId);
  const copy = AUTONOMY_LEVEL_CARDS[workerId];
  if (copy) {
    return {
      intro: copy.intro,
      levels: copy.levels.filter((card) => allowed.includes(card.level)),
    };
  }
  // Unknown Worker: generic card set restricted to its allowed levels.
  return {
    levels: allowed.map((level) => ({
      level,
      who: AUTONOMY_LEVEL_WHO[level],
      facts: [],
    })),
  };
};

/** Supervised warning copy for a Worker, shown only when supervised is the selected level. */
export const supervisedWarnForWorker = (workerName: string): string => supervisedWarn(workerName);
