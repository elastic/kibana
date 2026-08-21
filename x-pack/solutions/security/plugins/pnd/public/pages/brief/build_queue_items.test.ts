/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Investigation, Proposal } from '@kbn/pnd-common';
import { buildQueueItems } from '.';

const inv = (overrides: Partial<Investigation>): Investigation =>
  ({
    id: 'inv-test',
    template_id: 'investigation',
    title: 'Test investigation',
    createdAt: '2026-07-28T00:00:00Z',
    updatedAt: '2026-07-28T12:00:00Z',
    watch_id: 'watch-1',
    watch_execution_id: 'exec-1',
    status: 'open',
    pendingProposalCount: 1,
    events: [],
    ...overrides,
  } as unknown as Investigation);

const prop = (overrides: Partial<Proposal>): Proposal =>
  ({
    id: 'prop-test',
    template_id: 'proposal',
    parentConversationId: 'inv-test',
    type: 'contain',
    confidence: 0.85,
    reasoning: 'reasoning',
    evidenceRefs: [],
    status: 'pending',
    assignee: null,
    sla: null,
    events: [],
    sourceWatchId: 'watch-1',
    approvalRequired: true,
    summary: 'summary',
    recommendation: 'recommendation',
    ...overrides,
  } as unknown as Proposal);

/**
 * The ratified queue model (2026-07-28 design/eng sync, formalized in PR #82):
 * the analyst queue shows Proposals first — one row per pending Proposal, not
 * one row per Investigation. An Investigation with multiple independent
 * Proposals appears multiple times; the analyst drills from a Proposal back
 * to its parent Investigation.
 *
 * These tests pin that invariant so a future refactor can't silently revert
 * to investigation-first without a failing test explaining why it matters.
 */
describe('buildQueueItems — ratified queue model', () => {
  it('emits one row per pending proposal (not one per investigation)', () => {
    const investigation = inv({ id: 'inv-a', pendingProposalCount: 2 });
    const proposals = [
      prop({ id: 'prop-a1', parentConversationId: 'inv-a', status: 'pending' }),
      prop({ id: 'prop-a2', parentConversationId: 'inv-a', status: 'pending' }),
    ];

    const items = buildQueueItems([investigation], proposals);

    expect(items).toHaveLength(2);
    expect(items.every((i) => i.proposal != null)).toBe(true);
    expect(items.map((i) => i.key)).toEqual(['prop-a1', 'prop-a2']);
  });

  it('emits one row per investigation when it has zero pending proposals', () => {
    const investigation = inv({ id: 'inv-b', pendingProposalCount: 0, status: 'investigating' });
    const proposals = [prop({ id: 'prop-b1', parentConversationId: 'inv-b', status: 'approved' })];

    const items = buildQueueItems([investigation], proposals);

    // The single approved proposal does NOT get a row; the investigation does.
    expect(items).toHaveLength(1);
    expect(items[0].key).toBe('inv-b');
    expect(items[0].proposal).toBeUndefined();
  });

  it('an investigation with multiple proposals appears multiple times', () => {
    const investigation = inv({ id: 'inv-c', pendingProposalCount: 3 });
    const proposals = [
      prop({ id: 'prop-c1', parentConversationId: 'inv-c', status: 'pending', type: 'contain' }),
      prop({ id: 'prop-c2', parentConversationId: 'inv-c', status: 'pending', type: 'tune' }),
      prop({ id: 'prop-c3', parentConversationId: 'inv-c', status: 'pending', type: 'escalate' }),
    ];

    const items = buildQueueItems([investigation], proposals);

    // Three proposals, three rows — all pointing at the same parent investigation.
    expect(items).toHaveLength(3);
    expect(new Set(items.map((i) => i.investigation.id))).toEqual(new Set(['inv-c']));
    // Each carries its own recommendedAction from the proposal's type, not the
    // investigation's — the analyst sees the specific action per proposal.
    expect(items.map((i) => i.recommendedAction).sort()).toEqual(['contain', 'escalate', 'tune']);
  });

  it('does not emit a row for investigations with ≥1 pending proposal (they are represented by their proposal rows)', () => {
    const investigations = [
      inv({ id: 'inv-d', pendingProposalCount: 1 }),
      inv({ id: 'inv-e', pendingProposalCount: 0, status: 'open' }),
    ];
    const proposals = [prop({ id: 'prop-d1', parentConversationId: 'inv-d', status: 'pending' })];

    const items = buildQueueItems(investigations, proposals);

    // inv-d is represented by prop-d1; inv-e gets its own row (no pending).
    const keys = items.map((i) => i.key);
    expect(keys).toContain('prop-d1');
    expect(keys).toContain('inv-e');
    expect(keys).not.toContain('inv-d'); // no investigation-only row for inv-d
  });

  it('ignores proposals whose parent investigation is not in the list', () => {
    const proposals = [
      prop({ id: 'prop-orphan', parentConversationId: 'inv-missing', status: 'pending' }),
    ];

    const items = buildQueueItems([], proposals);

    expect(items).toEqual([]);
  });

  it('ignores non-pending proposals (approved, dismissed, etc.)', () => {
    const investigation = inv({ id: 'inv-f', pendingProposalCount: 0 });
    const proposals = [
      prop({ id: 'prop-f1', parentConversationId: 'inv-f', status: 'approved' }),
      prop({ id: 'prop-f2', parentConversationId: 'inv-f', status: 'dismissed' }),
      prop({ id: 'prop-f3', parentConversationId: 'inv-f', status: 'escalated' }),
    ];

    const items = buildQueueItems([investigation], proposals);

    // No pending proposals → investigation gets one row, no proposal rows.
    expect(items).toHaveLength(1);
    expect(items[0].key).toBe('inv-f');
  });

  it('sorts items by priority descending', () => {
    const investigations = [
      inv({ id: 'inv-low', pendingProposalCount: 0, priorityScore: 10 }),
      inv({ id: 'inv-high', pendingProposalCount: 0, priorityScore: 90 }),
      inv({ id: 'inv-mid', pendingProposalCount: 0, priorityScore: 50 }),
    ];

    const items = buildQueueItems(investigations, []);

    expect(items.map((i) => i.key)).toEqual(['inv-high', 'inv-mid', 'inv-low']);
  });

  it('falls back to proposal confidence when investigation priorityScore is absent', () => {
    const investigation = inv({ id: 'inv-g', pendingProposalCount: 1, priorityScore: undefined });
    const proposals = [
      prop({
        id: 'prop-g1',
        parentConversationId: 'inv-g',
        status: 'pending',
        confidence: 0.92,
      }),
    ];

    const items = buildQueueItems([investigation], proposals);

    expect(items[0].priority).toBe(92); // Math.round(0.92 * 100)
  });

  it('proposal rows carry parent investigation context', () => {
    const investigation = inv({
      id: 'inv-h',
      pendingProposalCount: 1,
      recordId: 'CASE-2047',
      watch_tier: 'floor',
    });
    const proposals = [prop({ id: 'prop-h1', parentConversationId: 'inv-h', status: 'pending' })];

    const items = buildQueueItems([investigation], proposals);

    expect(items[0].investigation.id).toBe('inv-h');
    expect(items[0].investigation.recordId).toBe('CASE-2047');
    expect(items[0].proposal?.id).toBe('prop-h1');
  });

  it('handles empty inputs gracefully', () => {
    expect(buildQueueItems([], [])).toEqual([]);
  });
});
