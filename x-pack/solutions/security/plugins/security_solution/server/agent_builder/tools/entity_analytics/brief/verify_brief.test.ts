/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BriefDraft, BriefFact, BriefPriority } from './brief_types';
import type { VerifiedBrief } from './verify_brief';
import { verifyBrief } from './verify_brief';

const facts: BriefFact[] = [
  { id: 1, entityId: 'host:a', text: 'In the "Risk movers" tile' },
  { id: 2, entityId: 'host:a', text: 'Asset criticality: high_impact' },
  { id: 3, entityId: 'user:b', text: 'In the "Watchlisted" tile' },
  { id: 4, entityId: 'user:c', text: 'In the "New entity" tile' },
  { id: 5, entityId: 'user:d', text: 'In the "New entity" tile' },
];

const priority = (entityId: string, factIds: number[]): BriefPriority => ({
  entityId,
  observed: 'Observed.',
  whyItMatters: 'Matters.',
  nextStep: 'Next.',
  factIds,
});

const draft = (attention: string, priorities: BriefPriority[]): BriefDraft => ({
  attention,
  priorities,
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
      { attention: '{{ entity.id host:a }} rose.', priorities: [] },
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
      'cuts tool-call markup leaked at the end of attention',
      draft('{{ entity.id host:a }} rose.</parameter>\n<parameter name="x">[]', [
        priority('host:a', [1]),
      ]),
      { attention: '{{ entity.id host:a }} rose.' },
    ],
  ])('%s', (_name, input, expected) => {
    expect(verifyBrief(input, facts)).toMatchObject(expected);
  });

  it('caps priority text at 20 words', () => {
    const [verified] = verifyBrief(
      draft('Look.', [{ ...priority('host:a', [1]), observed: `${words(25)}.` }]),
      facts
    ).priorities;
    expect(verified.observed).toBe(`${words(20)}…`);
  });
});
