/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Investigation } from '@kbn/agentic-investigations-common';
import { groupAsOneList, groupByCase, parseGroupBy, type QueueRow } from './group_by';

const row = (
  id: string,
  conversationId: string,
  proposalCreatedAt: string,
  isPending = true
): QueueRow => ({
  investigation: {
    id,
    conversationId,
    createdAt: proposalCreatedAt,
    proposalCreatedAt,
  } as Investigation,
  isPending,
});

const caseOf: Record<string, string> = {
  conv1: 'case-a',
  conv2: 'case-a',
  conv3: 'case-b',
  conv4: 'gone',
};

describe('queue group by', () => {
  const rows = [
    row('p1', 'conv1', '2026-11-06T10:00:00Z'),
    row('p2', 'conv1', '2026-11-06T10:05:00Z', false),
    row('p3', 'conv2', '2026-11-06T09:00:00Z'),
    row('p4', 'conv3', '2026-11-06T11:00:00Z'),
    row('p5', 'conv4', '2026-11-06T08:00:00Z'),
    row('p6', 'conv5', '2026-11-06T12:00:00Z'),
  ];

  it('reads the grouping from the URL, defaulting to proposal type', () => {
    expect(parseGroupBy('case')).toBe('case');
    expect(parseGroupBy('none')).toBe('none');
    expect(parseGroupBy('nonsense')).toBe('type');
    expect(parseGroupBy(null)).toBe('type');
  });

  it('groups cards by case, then unavailable cases, then no case', () => {
    const groups = groupByCase(
      rows,
      (investigation) => caseOf[investigation.conversationId ?? ''],
      (caseId) => caseId === 'gone'
    );

    expect(groups.map(({ kind, caseId }) => caseId ?? kind)).toEqual([
      'case-b',
      'case-a',
      'unavailable',
      'noCase',
    ]);
    const caseA = groups[1];
    expect(caseA.rows.map(({ investigation }) => investigation.id)).toEqual(['p2', 'p1', 'p3']);
    expect(caseA.investigationCount).toBe(2);
    expect(caseA.pendingCount).toBe(2);
  });

  it('keeps cards whose case is still loading in that case, not under Case unavailable', () => {
    const summaries: Record<string, null | undefined> = { gone: null };
    const groups = groupByCase(
      rows,
      (investigation) => caseOf[investigation.conversationId ?? ''],
      // `case-a` and `case-b` are not read yet (undefined); only `gone` is known to be missing.
      (caseId) => summaries[caseId] === null
    );

    expect(groups.find(({ caseId }) => caseId === 'case-a')?.rows).toHaveLength(3);
    expect(groups.find(({ kind }) => kind === 'unavailable')?.rows).toHaveLength(1);
  });

  it('lists every card newest first for None', () => {
    const group = groupAsOneList(rows);
    expect(group.rows.map(({ investigation }) => investigation.id)).toEqual([
      'p6',
      'p4',
      'p2',
      'p1',
      'p3',
      'p5',
    ]);
    expect(group.investigationCount).toBe(5);
    expect(group.pendingCount).toBe(5);
  });
});
