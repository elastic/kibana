/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BriefDraft, BriefPriority } from './prompts';
import type { EntityFacts } from './types';
import type { VerifiedBrief } from './verify_draft';
import { verifyDraft } from './verify_draft';

const facts: EntityFacts[] = ['host:a', 'host:ab', 'user:b', 'user:c', 'user:d'].map(
  (entityId) => ({
    entityId,
    name: entityId,
    type: 'host',
    flaggedFor: ['riskMovers'],
  })
);

const priority = (entityId: string, assessment = 'Assessed.'): BriefPriority => ({
  entityId,
  assessment,
  whyFirst: 'Matters.',
  nextStep: 'Next.',
});

const draft = (priorities: BriefPriority[]): BriefDraft => ({
  title: 'Alerts on {{ entity.id host:a }} spread',
  summary: 'Summary of {{ entity.id host:a }} and {{ entity.id host:unknown }}.',
  priorities,
  recommendation: 'Review {{ entity.id host:a }} first.',
});

describe('verifyDraft', () => {
  it.each<[string, BriefDraft, Partial<VerifiedBrief>]>([
    [
      'drops a priority for an entity the view does not flag',
      draft([priority('host:unknown'), priority('host:a')]),
      { priorities: [priority('host:a')], droppedPriorityCount: 1 },
    ],
    [
      'keeps one priority per entity, and at most three',
      draft(['host:a', 'host:a', 'user:b', 'user:c', 'user:d'].map((id) => priority(id))),
      { priorities: ['host:a', 'user:b', 'user:c'].map((id) => priority(id)) },
    ],
    [
      'removes mentions of entities the view does not flag',
      draft([priority('host:a', 'Seen with {{ entity.id host:unknown }}.')]),
      {
        summary: 'Summary of {{ entity.id host:a }} and .',
        priorities: [priority('host:a', 'Seen with .')],
      },
    ],
    [
      "turns a flagged entity's EUID written out into its mention",
      draft([priority('host:a', 'Seen on user:b and host:ab.')]),
      {
        priorities: [
          priority('host:a', 'Seen on {{ entity.id user:b }} and {{ entity.id host:ab }}.'),
        ],
      },
    ],
    [
      'removes every entity mention from the title',
      draft([priority('host:a')]),
      { title: 'Alerts on  spread' },
    ],
    [
      'has no title, summary or recommendation without a priority',
      draft([priority('host:unknown')]),
      { title: undefined, summary: undefined, recommendation: undefined, priorities: [] },
    ],
  ])('%s', (_name, input, expected) => {
    expect(verifyDraft(input, facts)).toMatchObject(expected);
  });
});
