/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { BriefDraft, BriefPriority, EntityFacts } from './brief_types';
import type { VerifiedBrief } from './verify_draft';
import { verifyDraft } from './verify_draft';

const entity = (entityId: string, name: string, score?: number): EntityFacts => ({
  entityId,
  name,
  type: 'host',
  flaggedFor: ['riskMovers'],
  risk: score === undefined ? undefined : { of: 'entity', level: 'High', score },
});

const facts = [
  entity('host:a', 'web-01', 74),
  entity('user:b', 'b'),
  entity('user:c', 'c'),
  entity('user:d', 'd'),
];

const scope: EntityAnalyticsScope = {
  period: '7d',
  capturedAt: '2026-10-14T12:00:00.000Z',
  tiles: {
    entitiesWithAlerts: { title: 'Entities with alerts', value: 48213, delta: -120, entityIds: [] },
  },
};

const verify = (input: BriefDraft) => verifyDraft(input, facts, scope);

const priority = (entityId: string): BriefPriority => ({
  entityId,
  observed: 'Observed.',
  whyItMatters: 'Matters.',
  nextStep: 'Next.',
});

const draft = (
  attention: string,
  priorities: BriefPriority[],
  recommendation = 'Review {{ entity.id host:a }} first.'
): BriefDraft => ({
  attention,
  priorities,
  recommendation,
});

const words = (count: number): string => Array.from({ length: count }, () => 'word').join(' ');

describe('verifyDraft', () => {
  it.each<[string, BriefDraft, Partial<VerifiedBrief>]>([
    [
      'drops an unknown entity',
      draft('Look.', [priority('host:zzz'), priority('host:a')]),
      { priorities: [priority('host:a')], droppedPriorityCount: 1 },
    ],
    [
      'removes unknown mentions and keeps known ones',
      draft('{{ entity.id host:zzz }} and {{entity.id host:a}} rose.', [priority('host:a')]),
      { attention: 'and {{ entity.id host:a }} rose.' },
    ],
    [
      'dedupes entities',
      draft('Look.', [priority('host:a'), priority('host:a')]),
      { priorities: [priority('host:a')], droppedPriorityCount: 1 },
    ],
    [
      'caps the priorities at three',
      draft('Look.', [
        priority('host:a'),
        priority('user:b'),
        priority('user:c'),
        priority('user:d'),
      ]),
      {
        priorities: [priority('host:a'), priority('user:b'), priority('user:c')],
        droppedPriorityCount: 1,
      },
    ],
    [
      'drops attention without priorities',
      draft('Things happened.', [priority('host:zzz')]),
      { attention: undefined, priorities: [] },
    ],
    [
      'checks the recommendation like attention: unknown mentions and unsupported numbers go',
      draft(
        'Look.',
        [priority('host:a')],
        'Check {{ entity.id host:a }}{{ entity.id host:zzz }} first. Then 999 hosts.'
      ),
      { recommendation: 'Check {{ entity.id host:a }} first.' },
    ],
    [
      'caps attention at 40 words, counting a mention as one word',
      draft(`{{ entity.id host:a }} ${words(45)}`, [priority('host:a')]),
      { attention: `{{ entity.id host:a }} ${words(39)}…` },
    ],
    [
      'keeps the text as written under the cap, including punctuation after a mention',
      draft('Both {{ entity.id host:a }}, and others, rose.', [priority('host:a')]),
      { attention: 'Both {{ entity.id host:a }}, and others, rose.' },
    ],
    [
      'keeps numbers from any entity and the view, with separators',
      draft('{{ entity.id host:a }} scores 74; 48,213 entities alert, 120 fewer.', [
        priority('host:a'),
      ]),
      { attention: '{{ entity.id host:a }} scores 74; 48,213 entities alert, 120 fewer.' },
    ],
    [
      "keeps the period and the numbers in what an entity's flags mean",
      draft('Look.', [
        { ...priority('host:a'), observed: 'Risk rose at least 10 points in 7 days.' },
      ]),
      {
        priorities: [
          { ...priority('host:a'), observed: 'Risk rose at least 10 points in 7 days.' },
        ],
      },
    ],
    [
      'drops a sentence with a number in neither the entities nor the view',
      draft('{{ entity.id host:a }} scores 74. Over 300 hosts are affected.', [priority('host:a')]),
      { attention: '{{ entity.id host:a }} scores 74.' },
    ],
    [
      'ignores digits in mentions, names and EUIDs',
      draft('{{ entity.id host:a }} (web-01, host:a) rose.', [priority('host:a')]),
      { attention: '{{ entity.id host:a }} (web-01, host:a) rose.' },
    ],
    [
      "drops a priority quoting a number that isn't its own entity's or the view's",
      draft('Look.', [
        { ...priority('host:a'), nextStep: 'Review its 12 alerts.' },
        { ...priority('user:b'), whyItMatters: 'Score 74, as on web-01.' },
        { ...priority('user:c'), whyItMatters: 'One of 48,213 alerting.' },
      ]),
      {
        priorities: [{ ...priority('user:c'), whyItMatters: 'One of 48,213 alerting.' }],
        droppedPriorityCount: 2,
      },
    ],
    [
      'cuts tool-call markup leaked at the end of attention',
      draft('{{ entity.id host:a }} rose.</parameter>\n<parameter name="x">[]', [
        priority('host:a'),
      ]),
      { attention: '{{ entity.id host:a }} rose.' },
    ],
  ])('%s', (_name, input, expected) => {
    expect(verify(input)).toMatchObject(expected);
  });

  it('caps at whole sentences, cutting only a single over-long sentence', () => {
    const { attention } = verify(draft(`Short one. ${words(45)}.`, [priority('host:a')]));
    expect(attention).toBe('Short one.');
  });

  it('caps priority text at 20 words', () => {
    const [verified] = verify(
      draft('Look.', [{ ...priority('host:a'), observed: `${words(25)}.` }])
    ).priorities;
    expect(verified.observed).toBe(`${words(20)}…`);
  });
});
