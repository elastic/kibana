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
    case SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID:
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
            defaultMessage: 'Analyzes and classifies every alert batch; closures wait for you.',
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
              'Analyzes and classifies every batch; closes false positives automatically at or above the confidence score.',
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
            parts: [pill('worker'), text(' close automatically at the confidence score')],
          },
        ],
      },
      {
        level: 'supervised',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.alertTriage.supervised.who',
          {
            defaultMessage:
              'Closures behave the same as Assisted for this Worker — the level future-proofs later write actions.',
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
            parts: [pill('worker'), text(' close automatically at the confidence score')],
          },
        ],
      },
    ],
  },
  [SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID]: {
    intro: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.threatHunt.intro', {
      defaultMessage:
        'It always hunts and gathers evidence; the level decides who turns findings into Proposals and who runs them.',
    }),
    levels: [
      {
        level: 'manual',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.threatHunt.manual.who',
          {
            defaultMessage: 'Hunts on its schedule and drafts Proposals; you decide what runs.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.manual.proposals',
              { defaultMessage: 'Proposals' }
            ),
            parts: [pill('you'), text(' approve each before it runs')],
          },
        ],
      },
      {
        level: 'assisted',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.threatHunt.assisted.who',
          {
            defaultMessage:
              'Hunts on its schedule and drafts Proposals; reversible actions run after your approval.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.assisted.proposals',
              { defaultMessage: 'Proposals' }
            ),
            parts: [pill('worker'), text(' drafts; '), pill('you'), text(' approve each')],
          },
        ],
      },
      {
        level: 'supervised',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.threatHunt.supervised.who',
          {
            defaultMessage:
              'Hunts and runs reversible actions on its own within policy; you review afterwards.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.supervised.proposals',
              { defaultMessage: 'Proposals' }
            ),
            parts: [pill('worker'), text(' runs reversible actions automatically')],
          },
        ],
      },
    ],
  },
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: {
    intro: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.ruleTuning.intro', {
      defaultMessage:
        'It always diagnoses rules and drafts tuning Proposals; the level decides who reviews them.',
    }),
    levels: [
      {
        level: 'manual',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.manual.who',
          {
            defaultMessage: 'Diagnoses rules and drafts tuning Proposals for your review.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.manual.proposals',
              { defaultMessage: 'Proposals' }
            ),
            parts: [pill('you'), text(' review each before it applies')],
          },
        ],
      },
      {
        level: 'assisted',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.assisted.who',
          {
            defaultMessage:
              'Diagnoses rules and applies reversible tuning automatically; changes beyond policy still wait for you.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.assisted.proposals',
              { defaultMessage: 'Proposals' }
            ),
            parts: [pill('worker'), text(' applies reversible tuning automatically')],
          },
        ],
      },
    ],
  },
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID]: {
    intro: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.intro', {
      defaultMessage:
        'It always drafts rule logic for coverage gaps; the level decides who reviews before anything is installed.',
    }),
    levels: [
      {
        level: 'manual',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.manual.who',
          {
            defaultMessage:
              'Drafts new rule logic for coverage gaps; you review each before install.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.manual.proposals',
              { defaultMessage: 'Proposals' }
            ),
            parts: [pill('you'), text(' review each before install')],
          },
        ],
      },
      {
        level: 'assisted',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.assisted.who',
          {
            defaultMessage:
              'Drafts and installs prebuilt rules automatically; new rule logic still waits for your review.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.assisted.proposals',
              { defaultMessage: 'Proposals' }
            ),
            parts: [pill('worker'), text(' installs prebuilt rules automatically')],
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
