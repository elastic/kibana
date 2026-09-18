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
  /** Complete sentence; `<you>`/`<worker>` mark where an actor pill is inserted. */
  value: string;
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

/**
 * Actor tokens inside a fact value. A value is one whole sentence rather than a chain of English
 * fragments, so a translation can place the pills anywhere in it (including dropping or reordering
 * them) instead of inheriting the word order of the source string. `ignoreTag` keeps the tokens
 * literal: without it the ICU parser would read them as tags and demand closing ones.
 */
const ACTOR_TOKENS: Record<LevelCardActor, string> = { you: '<you>', worker: '<worker>' };

const ACTOR_TOKEN_PATTERN = /(<you>|<worker>)/;

const factValue = (id: string, defaultMessage: string): string =>
  i18n.translate(id, { defaultMessage, ignoreTag: true });

const pill = (actor: LevelCardActor): LevelCardFactPart => ({ kind: 'pill', actor });
const text = (t: string): LevelCardFactPart => ({ kind: 'text', text: t });

/** Splits a translated fact value into the pill/text parts the card renders. */
export const factValueParts = (value: string): LevelCardFactPart[] =>
  value
    .split(ACTOR_TOKEN_PATTERN)
    .filter((chunk) => chunk.length > 0)
    .map((chunk) =>
      chunk === ACTOR_TOKENS.you
        ? pill('you')
        : chunk === ACTOR_TOKENS.worker
        ? pill('worker')
        : text(chunk)
    );

const actorLabel = (actor: LevelCardActor): string =>
  actor === 'you'
    ? i18n.translate('xpack.alertzero.watches.settings.autonomyCards.actorYou', {
        defaultMessage: 'You',
      })
    : i18n.translate('xpack.alertzero.watches.settings.autonomyCards.actorWorker', {
        defaultMessage: 'Worker',
      });

/** Resolves a fact value to plain text for aria-labels and tests. */
export const factValueToText = (value: string): string =>
  factValueParts(value)
    .map((part) => (part.kind === 'pill' ? actorLabel(part.actor) : part.text))
    .join('');

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
 *
 * Card copy may only name behaviour the Worker has: Alert Triage's cards describe
 * who decides a closure (the level's own contract, as the card intro frames it),
 * not a confidence threshold, because no Worker settings field or consumer for one
 * exists.
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
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.manual.incidentsValue',
              '<you> approve each escalation'
            ),
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
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.supervised.incidentsValue',
              '<worker> escalates Investigations automatically'
            ),
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
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.manual.classifiesValue',
              '<worker> every batch'
            ),
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.manual.closures',
              { defaultMessage: 'Closures' }
            ),
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.manual.closuresValue',
              '<you> answer each Proposal — accept to close, or reject and re-tag'
            ),
          },
        ],
      },
      {
        level: 'assisted',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.alertTriage.assisted.who',
          {
            defaultMessage: 'Closes false positives on its own; you review and can reopen.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.assisted.classifies',
              { defaultMessage: 'Classifies' }
            ),
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.assisted.classifiesValue',
              '<worker> every batch'
            ),
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.assisted.closures',
              { defaultMessage: 'Closures' }
            ),
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.assisted.closuresValue',
              '<worker> closes false positives on its own — <you> reopen any you disagree with'
            ),
          },
        ],
      },
      {
        level: 'supervised',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.alertTriage.supervised.who',
          {
            defaultMessage: 'Closes false positives on its own — same as Assisted for this Worker.',
          }
        ),
        facts: [
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.supervised.classifies',
              { defaultMessage: 'Classifies' }
            ),
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.supervised.classifiesValue',
              '<worker> every batch'
            ),
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.supervised.closures',
              { defaultMessage: 'Closures' }
            ),
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.supervised.closuresValue',
              '<worker> closes false positives on its own — <you> reopen any you disagree with'
            ),
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
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.manual.huntValue',
              '<you> approve before it hunts'
            ),
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.manual.proposals',
              { defaultMessage: 'Proposals' }
            ),
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.manual.proposalsValue',
              '<you> approve each'
            ),
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
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.assisted.huntValue',
              '<worker> hunts every report automatically'
            ),
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.assisted.proposals',
              { defaultMessage: 'Proposals' }
            ),
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.assisted.proposalsValue',
              '<you> approve each'
            ),
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
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.supervised.huntValue',
              '<worker> hunts every report automatically'
            ),
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.supervised.proposals',
              { defaultMessage: 'Proposals' }
            ),
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.supervised.proposalsValue',
              '<worker> answers them automatically — reversible by <you>. Every action is recorded.'
            ),
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
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.manual.analysisValue',
              '<you> approve before it analyzes a rule'
            ),
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.manual.proposals',
              { defaultMessage: 'Proposals' }
            ),
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.manual.proposalsValue',
              '<you> approve each'
            ),
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
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.assisted.analysisValue',
              '<worker> analyzes every qualifying rule automatically'
            ),
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.assisted.proposals',
              { defaultMessage: 'Proposals' }
            ),
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.assisted.proposalsValue',
              '<you> approve each'
            ),
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
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.manual.draftingValue',
              '<you> approve before it drafts against a gap'
            ),
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.manual.proposals',
              { defaultMessage: 'Proposals' }
            ),
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.manual.proposalsValue',
              '<you> approve each'
            ),
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
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.assisted.draftingValue',
              '<worker> drafts against every gap signal automatically'
            ),
          },
          {
            label: i18n.translate(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.assisted.proposals',
              { defaultMessage: 'Proposals' }
            ),
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.assisted.proposalsValue',
              '<you> approve each'
            ),
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
