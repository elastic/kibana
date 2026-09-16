/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Use of this file is governed by the
 * Elastic License 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { WatchAutonomyLevel } from '@kbn/alertzero-common';

/**
 * Consequence-forward autonomy level cards — copy verbatim from the Sep 11
 * prototype (elastic/notdaybreak_mvp workerAutonomyLevelCards.ts, derived from
 * az-consequence-forward-settings.html).
 *
 * The prototype keys cards by worker kind; our live workers map:
 *   attack-discovery  -> Watch Floor "Attack Discovery" + Hunt Watch AD
 *   alert-analysis    -> Watch Floor "Alert Triage" (alert-analysis skill)
 *   endpoint-analysis -> Forensics Watch "Endpoint analysis"
 *
 * Levels not listed for a worker are not supported (e.g. Attack Discovery has
 * no Assisted level). Per-worker autonomy subsets are still being settled
 * (common-layer WG, Sep 11); keep this declarative so the final decision is a
 * data change, not a UI change.
 */

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

const fact = (label: string, parts: LevelCardFactPart[]): LevelCardFact => ({ label, parts });

const pill = (actor: LevelCardActor): LevelCardFactPart => ({ kind: 'pill', actor });
const text = (t: string): LevelCardFactPart => ({ kind: 'text', text: t });

export const AUTONOMY_LEVEL_CARDS: Record<string, AutonomyLevelCardsCopy> = {
  'attack-discovery': {
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
          fact(
            i18n.translate('xpack.alertzero.watches.settings.autonomyCards.labels.runs', {
              defaultMessage: 'Runs',
            }),
            [pill('you'), text(' click Run')]
          ),
          fact(
            i18n.translate('xpack.alertzero.watches.settings.autonomyCards.labels.investigations', {
              defaultMessage: 'Investigations',
            }),
            [text('drafted for your review')]
          ),
          fact(
            i18n.translate('xpack.alertzero.watches.settings.autonomyCards.labels.youHear', {
              defaultMessage: 'You hear',
            }),
            [text('when you open the run')]
          ),
        ],
      },
      {
        level: 'supervised',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.supervised.who',
          { defaultMessage: 'Handles the attack lifecycle within policy. You review afterwards.' }
        ),
        facts: [
          fact(
            i18n.translate('xpack.alertzero.watches.settings.autonomyCards.labels.runs', {
              defaultMessage: 'Runs',
            }),
            [pill('worker'), text(' on schedule')]
          ),
          fact(
            i18n.translate('xpack.alertzero.watches.settings.autonomyCards.labels.investigations', {
              defaultMessage: 'Investigations',
            }),
            [pill('worker'), text(' opens & progresses')]
          ),
          fact(
            i18n.translate('xpack.alertzero.watches.settings.autonomyCards.labels.youHear', {
              defaultMessage: 'You hear',
            }),
            [text('after, in the queue')]
          ),
        ],
      },
    ],
  },
  'alert-analysis': {
    intro: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.alertAnalysis.intro', {
      defaultMessage:
        'It always analyzes, tags, and writes notes; the level decides who closes false positives.',
    }),
    levels: [
      {
        level: 'manual',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.alertAnalysis.manual.who',
          {
            defaultMessage: 'Analyzes every batch; every closure waits for you.',
          }
        ),
        facts: [
          fact(
            i18n.translate('xpack.alertzero.watches.settings.autonomyCards.labels.classifies', {
              defaultMessage: 'Classifies',
            }),
            [pill('worker'), text(' every batch')]
          ),
          fact(
            i18n.translate('xpack.alertzero.watches.settings.autonomyCards.labels.closesFps', {
              defaultMessage: 'Closes FPs',
            }),
            [pill('you'), text(' approve each')]
          ),
          fact(
            i18n.translate('xpack.alertzero.watches.settings.autonomyCards.labels.youHear', {
              defaultMessage: 'You hear',
            }),
            [text('when a closure awaits you')]
          ),
          fact(
            i18n.translate('xpack.alertzero.watches.settings.autonomyCards.labels.undo', {
              defaultMessage: 'Undo',
            }),
            [text('dismiss before it closes')]
          ),
        ],
      },
      {
        level: 'assisted',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.alertAnalysis.assisted.who',
          {
            defaultMessage:
              'Closes false positives automatically at or above the confidence score.',
          }
        ),
        facts: [
          fact(
            i18n.translate('xpack.alertzero.watches.settings.autonomyCards.labels.classifies', {
              defaultMessage: 'Classifies',
            }),
            [pill('worker'), text(' every batch')]
          ),
          fact(
            i18n.translate('xpack.alertzero.watches.settings.autonomyCards.labels.closesFps', {
              defaultMessage: 'Closes FPs',
            }),
            [pill('worker'), text(' ≥ confidence')]
          ),
          fact(
            i18n.translate('xpack.alertzero.watches.settings.autonomyCards.labels.youHear', {
              defaultMessage: 'You hear',
            }),
            [text('after closing, in the queue')]
          ),
          fact(
            i18n.translate('xpack.alertzero.watches.settings.autonomyCards.labels.undo', {
              defaultMessage: 'Undo',
            }),
            [text('reopen any closed alert')]
          ),
        ],
      },
      {
        level: 'supervised',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.alertAnalysis.supervised.who',
          {
            defaultMessage:
              'Closes false positives automatically — same as Assisted for this Worker.',
          }
        ),
        facts: [
          fact(
            i18n.translate('xpack.alertzero.watches.settings.autonomyCards.labels.classifies', {
              defaultMessage: 'Classifies',
            }),
            [pill('worker'), text(' every batch')]
          ),
          fact(
            i18n.translate('xpack.alertzero.watches.settings.autonomyCards.labels.closesFps', {
              defaultMessage: 'Closes FPs',
            }),
            [pill('worker'), text(' ≥ confidence')]
          ),
          fact(
            i18n.translate('xpack.alertzero.watches.settings.autonomyCards.labels.youHear', {
              defaultMessage: 'You hear',
            }),
            [text('after closing, in the queue')]
          ),
          fact(
            i18n.translate('xpack.alertzero.watches.settings.autonomyCards.labels.undo', {
              defaultMessage: 'Undo',
            }),
            [text('reopen any closed alert')]
          ),
        ],
      },
    ],
  },
  'endpoint-analysis': {
    intro: i18n.translate('xpack.alertzero.watches.settings.autonomyCards.endpointAnalysis.intro', {
      defaultMessage: 'This Worker supports one level.',
    }),
    levels: [
      {
        level: 'manual',
        who: i18n.translate(
          'xpack.alertzero.watches.settings.autonomyCards.endpointAnalysis.manual.who',
          {
            defaultMessage:
              'Runs a forensics pass when an analyst starts it, and attaches findings to the investigation.',
          }
        ),
        facts: [
          fact(
            i18n.translate('xpack.alertzero.watches.settings.autonomyCards.labels.starts', {
              defaultMessage: 'Starts',
            }),
            [pill('you'), text(' from an investigation')]
          ),
          fact(
            i18n.translate('xpack.alertzero.watches.settings.autonomyCards.labels.findings', {
              defaultMessage: 'Findings',
            }),
            [pill('worker'), text(' attaches them')]
          ),
          fact(
            i18n.translate('xpack.alertzero.watches.settings.autonomyCards.labels.response', {
              defaultMessage: 'Response',
            }),
            [text('waits for your approval')]
          ),
        ],
      },
    ],
  },
};
