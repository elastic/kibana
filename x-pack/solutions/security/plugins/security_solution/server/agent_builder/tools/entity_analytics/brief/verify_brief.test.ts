/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { BriefDraft, BriefFact, BriefPriority } from './brief_types';
import type { VerifiedBrief } from './verify_brief';
import { verifyBrief } from './verify_brief';

const facts: BriefFact[] = [
  { id: 1, entityId: 'host:a', text: 'In the "Risk movers" tile' },
  { id: 2, entityId: 'host:a', text: 'Current risk: High (score 74)' },
  { id: 3, entityId: 'user:b', text: 'In the "Watchlisted" tile' },
  { id: 4, entityId: 'user:c', text: 'In the "New entity" tile' },
  { id: 5, entityId: 'user:d', text: 'In the "New entity" tile' },
];

const scope: EntityAnalyticsScope = {
  period: '7d',
  capturedAt: '2026-10-14T12:00:00.000Z',
  tiles: { entitiesWithAlerts: { value: 48213, delta: -120, entityIds: [] } },
};

const candidates = [
  { id: 'host:a', name: 'web-01' },
  { id: 'user:b', name: 'b' },
  { id: 'user:c', name: 'c' },
  { id: 'user:d', name: 'd' },
];

const verify = (input: BriefDraft) => verifyBrief(input, facts, scope, candidates);

const priority = (entityId: string, factIds: number[]): BriefPriority => ({
  entityId,
  observed: 'Observed.',
  whyItMatters: 'Matters.',
  nextStep: 'Next.',
  factIds,
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

describe('verifyBrief', () => {
  it.each<[string, BriefDraft, Partial<VerifiedBrief>]>([
    [
      "keeps only facts about the priority's own entity",
      draft('Look at {{ entity.id host:a }}.', [priority('host:a', [1, 3, 2, 99, 1])]),
      { priorities: [priority('host:a', [1, 2])], droppedPriorityCount: 0 },
    ],
    [
      'drops a priority citing only facts about other entities',
      draft('Look.', [priority('host:a', [3]), priority('user:b', [3])]),
      { priorities: [priority('user:b', [3])], droppedPriorityCount: 1 },
    ],
    [
      'drops an unknown entity',
      draft('Look.', [priority('host:zzz', [1]), priority('host:a', [1])]),
      { priorities: [priority('host:a', [1])], droppedPriorityCount: 1 },
    ],
    [
      'removes unknown mentions and keeps known ones',
      draft('{{ entity.id host:zzz }} and {{entity.id host:a}} rose.', [priority('host:a', [1])]),
      { attention: 'and {{ entity.id host:a }} rose.' },
    ],
    [
      'dedupes entities',
      draft('Look.', [priority('host:a', [1]), priority('host:a', [2])]),
      { priorities: [priority('host:a', [1])], droppedPriorityCount: 1 },
    ],
    [
      'caps the priorities at three',
      draft('Look.', [
        priority('host:a', [1]),
        priority('user:b', [3]),
        priority('user:c', [4]),
        priority('user:d', [5]),
      ]),
      {
        priorities: [priority('host:a', [1]), priority('user:b', [3]), priority('user:c', [4])],
        droppedPriorityCount: 1,
      },
    ],
    [
      'drops attention without priorities unless it names a candidate',
      draft('Things happened.', [priority('host:zzz', [1])]),
      { attention: undefined, priorities: [] },
    ],
    [
      'keeps attention without priorities when it names a candidate',
      draft('{{ entity.id host:a }} rose.', []),
      { attention: '{{ entity.id host:a }} rose.', priorities: [], recommendation: undefined },
    ],
    [
      'checks the recommendation like attention: unknown mentions and unsupported numbers go',
      draft(
        'Look.',
        [priority('host:a', [1])],
        'Check {{ entity.id host:a }}{{ entity.id host:zzz }} first. Then 999 hosts.'
      ),
      { recommendation: 'Check {{ entity.id host:a }} first.' },
    ],
    [
      'caps attention at 40 words, counting a mention as one word',
      draft(`{{ entity.id host:a }} ${words(45)}`, [priority('host:a', [1])]),
      { attention: `{{ entity.id host:a }} ${words(39)}…` },
    ],
    [
      'keeps the text as written under the cap, including punctuation after a mention',
      draft('Both {{ entity.id host:a }}, and others, rose.', [priority('host:a', [1])]),
      { attention: 'Both {{ entity.id host:a }}, and others, rose.' },
    ],
    [
      'keeps numbers from the facts, tile values and changes, with separators',
      draft('{{ entity.id host:a }} scores 74; 48,213 entities alert, 120 fewer.', [
        priority('host:a', [1]),
      ]),
      { attention: '{{ entity.id host:a }} scores 74; 48,213 entities alert, 120 fewer.' },
    ],
    [
      'drops a sentence with a number in neither the facts nor the tiles',
      draft('{{ entity.id host:a }} scores 74. Over 300 hosts are affected.', [
        priority('host:a', [1]),
      ]),
      { attention: '{{ entity.id host:a }} scores 74.' },
    ],
    [
      'ignores digits in mentions, names and EUIDs',
      draft('{{ entity.id host:a }} (web-01, host:a) rose.', [priority('host:a', [1])]),
      { attention: '{{ entity.id host:a }} (web-01, host:a) rose.' },
    ],
    [
      'drops a priority with an unsupported number in any field',
      draft('Look.', [
        { ...priority('host:a', [1]), nextStep: 'Review its 12 alerts.' },
        { ...priority('user:b', [3]), whyItMatters: 'Score 74, as on web-01.' },
      ]),
      {
        priorities: [{ ...priority('user:b', [3]), whyItMatters: 'Score 74, as on web-01.' }],
        droppedPriorityCount: 1,
      },
    ],
    [
      'cuts tool-call markup leaked at the end of attention',
      draft('{{ entity.id host:a }} rose.</parameter>\n<parameter name="x">[]', [
        priority('host:a', [1]),
      ]),
      { attention: '{{ entity.id host:a }} rose.' },
    ],
  ])('%s', (_name, input, expected) => {
    expect(verify(input)).toMatchObject(expected);
  });

  it('caps at whole sentences, cutting only a single over-long sentence', () => {
    const { attention } = verify(draft(`Short one. ${words(45)}.`, [priority('host:a', [1])]));
    expect(attention).toBe('Short one.');
  });

  it('caps priority text at 20 words', () => {
    const [verified] = verify(
      draft('Look.', [{ ...priority('host:a', [1]), observed: `${words(25)}.` }])
    ).priorities;
    expect(verified.observed).toBe(`${words(20)}…`);
  });
});
