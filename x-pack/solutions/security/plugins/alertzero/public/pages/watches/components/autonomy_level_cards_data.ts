/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
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

const supervisedWarn = (workerName: string): string =>
  i18n.translate('xpack.alertzero.watches.settings.autonomyCards.supervisedWarn', {
    defaultMessage:
      'Highest level: {workerName} takes real actions on its own. Analysts review after the fact and can reverse.',
    values: { workerName },
  });

/** Worker display names used in the supervised warning copy. */
export const workerNameForCards = (workerId: string): string => {
  switch (workerId) {
    case SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID:
      return i18n.translate(
        'xpack.alertzero.watches.settings.autonomyCards.names.attackDiscovery',
        { defaultMessage: 'Attack discovery' }
      );
    case SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID:
      return i18n.translate('xpack.alertzero.watches.settings.autonomyCards.names.alertAnalysis', {
        defaultMessage: 'Alert analysis',
      });
    case SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID:
      return i18n.translate('xpack.alertzero.watches.settings.autonomyCards.names.threatHunt', {
        defaultMessage: 'Continuous threat hunt',
      });
    default:
      return i18n.translate('xpack.alertzero.watches.settings.autonomyCards.names.worker', {
        defaultMessage: 'this Worker',
      });
  }
};

/** Supervised-only warning shown under the cards at the highest level. */
export const supervisedWarnForWorker = (workerName: string): string => supervisedWarn(workerName);

/**
 * Consequence-forward level cards per Worker, ported from the Sep 14 prototype
 * (notdaybreak_mvp workerAutonomyLevelCards.ts). Copy describes what each
 * level does for THIS Worker — not a generic autonomy definition.
 */
const AUTONOMY_LEVEL_CARDS: Record<string, AutonomyLevelCardsCopy> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: {
    intro: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.intro', {
      defaultMessage:
        'Decides whether escalating an Investigation to an incident waits for your approval.',
    }),
    levels: [
      {
        level: 'manual',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.manual.who',
          {
            defaultMessage:
              'Runs on its schedule and opens Investigations; escalating to an incident waits for you.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.manual.incidents',
              { defaultMessage: 'Incidents' }
            ),
            parts: [pill('you'), text(' approve each escalation')],
          },
        ],
      },
      {
        level: 'supervised',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.supervised.who',
          {
            defaultMessage:
              'Runs on its schedule, opens Investigations, and escalates to incidents on its own.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.supervised.incidents',
              { defaultMessage: 'Incidents' }
            ),
            parts: [pill('worker'), text(' escalates Investigations automatically')],
          },
        ],
      },
    ],
  },
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: {
    intro: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.alertTriage.intro', {
      defaultMessage:
        'It analyzes, tags, and writes notes, then responds to new alerts. The level determines whether closures require your approval.',
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
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.manual.closures',
              { defaultMessage: 'Closures' }
            ),
            parts: [
              pill('you'),
              text(' answer each Proposal — accept to close, or reject and re-tag'),
            ],
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
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.assisted.closures',
              { defaultMessage: 'Closures' }
            ),
            parts: [
              pill('worker'),
              text(' answers Proposals automatically at ≥ confidence — '),
              pill('you'),
              text(' reopen any you disagree with'),
            ],
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
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.supervised.closures',
              { defaultMessage: 'Closures' }
            ),
            parts: [
              pill('worker'),
              text(' answers Proposals automatically at ≥ confidence — '),
              pill('you'),
              text(' reopen any you disagree with'),
            ],
          },
        ],
      },
    ],
  },
  [SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID]: {
    intro: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.threatHunt.intro', {
      defaultMessage: 'Decides how many checkpoints stand between its findings and action.',
    }),
    levels: [
      {
        level: 'manual',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.threatHunt.manual.who',
          {
            defaultMessage:
              'Two checkpoints: you approve what it hunts, and every Proposal waits for you.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.manual.hunt',
              { defaultMessage: 'Hunt' }
            ),
            parts: [pill('you'), text(' approve before it hunts')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.manual.proposals',
              { defaultMessage: 'Proposals' }
            ),
            parts: [pill('you'), text(' approve each')],
          },
        ],
      },
      {
        level: 'assisted',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.threatHunt.assisted.who',
          {
            defaultMessage: 'Hunts on its own; every Proposal still waits for you.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.assisted.hunt',
              { defaultMessage: 'Hunt' }
            ),
            parts: [pill('worker'), text(' hunts every report automatically')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.assisted.proposals',
              { defaultMessage: 'Proposals' }
            ),
            parts: [pill('you'), text(' approve each')],
          },
        ],
      },
      {
        level: 'supervised',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.threatHunt.supervised.who',
          {
            defaultMessage: 'Hunts and acts on its own. You review afterwards.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.supervised.hunt',
              { defaultMessage: 'Hunt' }
            ),
            parts: [pill('worker'), text(' hunts every report automatically')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.supervised.proposals',
              { defaultMessage: 'Proposals' }
            ),
            parts: [
              pill('worker'),
              text(' answers them automatically — reversible by '),
              pill('you'),
              text('. Every action is recorded.'),
            ],
          },
        ],
      },
    ],
  },
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: {
    intro: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.ruleTuning.intro', {
      defaultMessage:
        'Decides whether an entry checkpoint stands before analysis. Applying tuning always waits for your approval.',
    }),
    levels: [
      {
        level: 'manual',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.manual.who',
          {
            defaultMessage:
              'Two checkpoints: you approve what it analyzes, and every tuning proposal waits for you.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.manual.analysis',
              { defaultMessage: 'Analysis' }
            ),
            parts: [pill('you'), text(' approve before it analyzes a rule')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.manual.proposals',
              { defaultMessage: 'Proposals' }
            ),
            parts: [pill('you'), text(' approve each')],
          },
        ],
      },
      {
        level: 'assisted',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.assisted.who',
          {
            defaultMessage: 'Analyzes on its own; every tuning proposal still waits for you.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.assisted.analysis',
              { defaultMessage: 'Analysis' }
            ),
            parts: [pill('worker'), text(' analyzes every qualifying rule automatically')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.assisted.proposals',
              { defaultMessage: 'Proposals' }
            ),
            parts: [pill('you'), text(' approve each')],
          },
        ],
      },
    ],
  },
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID]: {
    intro: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.intro', {
      defaultMessage:
        'Decides whether an entry checkpoint stands before drafting. Installing always waits for your approval.',
    }),
    levels: [
      {
        level: 'manual',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.manual.who',
          {
            defaultMessage:
              'Two checkpoints: you approve what it drafts against, and every rule waits for you.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.manual.drafting',
              { defaultMessage: 'Drafting' }
            ),
            parts: [pill('you'), text(' approve before it drafts against a gap')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.manual.proposals',
              { defaultMessage: 'Proposals' }
            ),
            parts: [pill('you'), text(' approve each')],
          },
        ],
      },
      {
        level: 'assisted',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.assisted.who',
          {
            defaultMessage:
              'Drafts on its own from coverage gap signals; every rule still waits for you.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.assisted.drafting',
              { defaultMessage: 'Drafting' }
            ),
            parts: [pill('worker'), text(' drafts against every gap signal automatically')],
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.assisted.proposals',
              { defaultMessage: 'Proposals' }
            ),
            parts: [pill('you'), text(' approve each')],
          },
        ],
      },
    ],
  },
};

/**
 * Resolves the ported level cards for a Worker, filtered to the levels that
 * Worker offers. Returns null for Workers without card copy (the control
 * renders the plain level name).
 */
export const getAutonomyLevelCards = (workerId: string): AutonomyLevelCardsCopy | null => {
  const copy = AUTONOMY_LEVEL_CARDS[workerId];
  if (!copy) return null;
  return copy;
};
