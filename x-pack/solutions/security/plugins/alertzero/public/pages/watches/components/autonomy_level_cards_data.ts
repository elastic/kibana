/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  type WatchAutonomyLevel,
} from '@kbn/alertzero-common';

/** Pill actors inside level-card fact values. */
export type LevelCardActor = 'you' | 'worker';

export type LevelCardFactPart =
  | { kind: 'pill'; actor: LevelCardActor }
  | { kind: 'text'; text: string };

export interface LevelCardFact {
  /** Optional sentence-case label beside the value (rendered semibold). Omit for a sentence-only row. */
  label?: string;
  /** Complete sentence; `<you>`/`<worker>` mark where an actor pill is inserted. */
  value: string;
}

export interface AutonomyLevelCard {
  level: WatchAutonomyLevel;
  /** Optional one-sentence summary under the level name. */
  who?: string;
  facts: LevelCardFact[];
}

export interface AutonomyLevelCardsCopy {
  /** Optional subdued line under the Autonomy label. */
  intro?: string;
  /** Warning shown when the highest level is selected. Falls back to a generic warning. */
  supervisedWarning?: string;
  levels: AutonomyLevelCard[];
}

/**
 * Actor tokens inside a fact value. The value is one whole sentence so a translation can place the
 * pills anywhere in it. `ignoreTag` keeps the tokens literal for the ICU parser.
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
    case SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID:
      return i18n.translate(
        'xpack.alertzero.watches.settings.autonomyCards.names.endpointAnalysis',
        { defaultMessage: 'Endpoint analysis' }
      );
    default:
      return i18n.translate('xpack.alertzero.watches.settings.autonomyCards.names.worker', {
        defaultMessage: 'this Worker',
      });
  }
};

/** Supervised-only warning shown under the cards at the highest level. */
export const supervisedWarnForWorker = (workerName: string): string => supervisedWarn(workerName);

/**
 * Consequence-forward level cards per Worker: copy describes what each level does for THIS Worker,
 * not a generic autonomy definition, and may only name behaviour the Worker actually has. Each row
 * is one sentence that starts with who acts, so the cards need no summary line or row labels.
 */
const AUTONOMY_LEVEL_CARDS: Record<string, AutonomyLevelCardsCopy> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: {
    intro: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.intro', {
      defaultMessage:
        'Select whether starting a deep forensics investigation requires your approval.',
    }),
    supervisedWarning: i18n.translate(
      'xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.supervisedWarning',
      {
        defaultMessage:
          'At this autonomy level, Attack Discovery starts forensics investigations without your approval.',
      }
    ),
    levels: [
      {
        level: 'manual',
        facts: [
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.manual.workerValue',
              "<worker> opens an investigation for each attack and proposes a forensics investigation for those that aren't false positives."
            ),
          },
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.manual.youValue',
              '<you> approve or decline each proposed forensics investigation.'
            ),
          },
        ],
      },
      {
        level: 'supervised',
        facts: [
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.supervised.workerValue',
              '<worker> opens an investigation for each attack and starts forensics investigations without waiting for your approval.'
            ),
          },
        ],
      },
    ],
  },
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: {
    intro: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.alertTriage.intro', {
      defaultMessage: 'Select whether closing false positives requires your approval.',
    }),
    supervisedWarning: i18n.translate(
      'xpack.alertzero.watches.settings.autonomyCards.alertTriage.supervisedWarning',
      {
        defaultMessage:
          'At this autonomy level, Alert Triage closes false positives without your approval.',
      }
    ),
    levels: [
      {
        level: 'manual',
        facts: [
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.manual.workerValue',
              '<worker> classifies new alerts and proposes closing false positives.'
            ),
          },
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.manual.youValue',
              '<you> approve or decline each proposed closure.'
            ),
          },
        ],
      },
      {
        level: 'supervised',
        facts: [
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.supervised.workerValue',
              '<worker> classifies new alerts and closes false positives automatically.'
            ),
          },
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.alertTriage.supervised.youValue',
              '<you> can reopen closed alerts you disagree with.'
            ),
          },
        ],
      },
    ],
  },
  [SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID]: {
    intro: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.threatHunt.intro', {
      defaultMessage: 'This Watch always runs at Manual autonomy.',
    }),
    levels: [
      {
        level: 'manual',
        facts: [
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.manual.workerValue',
              '<worker> hunts each threat report, opens an investigation for it, and proposes actions to contain a threat it found.'
            ),
          },
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.manual.youValue',
              '<you> approve or decline each proposed action.'
            ),
          },
        ],
      },
      {
        level: 'assisted',
        facts: [
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.assisted.huntValue',
              '<worker> hunts every report automatically'
            ),
          },
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.assisted.proposalsValue',
              '<you> approve each'
            ),
          },
        ],
      },
      {
        level: 'supervised',
        facts: [
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.threatHunt.supervised.huntValue',
              '<worker> hunts every report automatically'
            ),
          },
          {
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
        'Select whether this Worker analyzes a rule on its own. Applying a tuning change always waits for your approval.',
    }),
    levels: [
      {
        level: 'manual',
        facts: [
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.manual.workerValue',
              '<worker> finds each qualifying rule and proposes a tuning change.'
            ),
          },
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.manual.youValue',
              '<you> approve before the Worker analyzes a rule, and approve or decline each proposed tuning change.'
            ),
          },
        ],
      },
      {
        level: 'assisted',
        facts: [
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.assisted.workerValue',
              '<worker> analyzes each qualifying rule and proposes a tuning change.'
            ),
          },
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.ruleTuning.assisted.youValue',
              '<you> approve or decline each proposed tuning change.'
            ),
          },
        ],
      },
    ],
  },
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID]: {
    intro: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.intro', {
      defaultMessage:
        'Select whether this Worker checks a coverage gap on its own. The proposed next step always waits for your approval.',
    }),
    levels: [
      {
        level: 'manual',
        facts: [
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.manual.workerValue',
              '<worker> reviews coverage gaps that Continuous Threat Hunt recorded.'
            ),
          },
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.manual.youValue',
              '<you> approve before the Worker checks a gap, and approve or decline each proposed next step.'
            ),
          },
        ],
      },
      {
        level: 'assisted',
        facts: [
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.assisted.workerValue',
              '<worker> checks each coverage gap and proposes a next step.'
            ),
          },
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.ruleCoverage.assisted.youValue',
              '<you> approve or decline each proposed next step.'
            ),
          },
        ],
      },
    ],
  },
  [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID]: {
    intro: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.endpointAnalysis.intro', {
      defaultMessage: 'Select whether response actions run without your approval.',
    }),
    supervisedWarning: i18n.translate(
      'xpack.alertzero.watches.settings.autonomyCards.endpointAnalysis.supervisedWarning',
      {
        defaultMessage:
          'At this autonomy level, Endpoint Analysis runs response actions without your approval.',
      }
    ),
    levels: [
      {
        level: 'manual',
        facts: [
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.endpointAnalysis.manual.workerValue',
              '<worker> adds an attack timeline, indicators of compromise, and its rationale to the investigation, and proposes response actions.'
            ),
          },
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.endpointAnalysis.manual.youValue',
              '<you> approve or decline each proposed response action.'
            ),
          },
        ],
      },
      {
        level: 'supervised',
        facts: [
          {
            value: factValue(
              'xpack.alertzero.watches.settings.autonomyCards.endpointAnalysis.supervised.workerValue',
              '<worker> adds an attack timeline, indicators of compromise, and its rationale to the investigation, and runs response actions without waiting for your approval.'
            ),
          },
        ],
      },
    ],
  },
};

/** Level cards for a Worker, filtered to the levels it offers; null when it has no card copy. */
export const getAutonomyLevelCards = (workerId: string): AutonomyLevelCardsCopy | null => {
  const copy = AUTONOMY_LEVEL_CARDS[workerId];
  if (!copy) return null;
  return copy;
};
