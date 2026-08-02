/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  deriveConversationIds,
  type PndProposalRow,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
} from '@kbn/pnd-common';

import { filterRowsByInvestigation } from '.';

const row = (overrides: Partial<PndProposalRow> = {}): PndProposalRow => ({
  alwaysGate: false,
  correlationId: 'ad-1',
  createdAt: '2026-08-02T00:05:00.000Z',
  gateId: 'open_investigation',
  inputSchema: { type: 'object' },
  message: 'Open an investigation for ad-1?',
  reasoning: 'High-confidence lateral movement detected',
  recommendedAction: 'investigate',
  reversible: true,
  sourceId: 'src-1',
  stepExecutionId: 'step-exec-1',
  stepId: 'await_open_investigation',
  title: 'Open investigation',
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  workflowRunId: 'run-1',
  ...overrides,
});

const { investigationConversationId } = deriveConversationIds('ad-1');

describe('filterRowsByInvestigation', () => {
  it('keeps a row whose discovery derives the given investigation conversation id', () => {
    const rows = [row()];

    expect(
      filterRowsByInvestigation({ investigationId: investigationConversationId, rows })
    ).toEqual(rows);
  });

  it('keeps a row addressed by the Attack Discovery alert id itself', () => {
    const rows = [row()];

    expect(filterRowsByInvestigation({ investigationId: 'ad-1', rows })).toEqual(rows);
  });

  it('drops a row correlated to a different discovery', () => {
    const rows = [row({ correlationId: 'ad-2' })];

    expect(filterRowsByInvestigation({ investigationId: 'ad-1', rows })).toEqual([]);
  });

  it('drops a row correlated to a different discovery when addressed by conversation id', () => {
    const rows = [row({ correlationId: 'ad-2' })];

    expect(
      filterRowsByInvestigation({ investigationId: investigationConversationId, rows })
    ).toEqual([]);
  });

  // An uncorrelated gate belongs to no investigation, so it must never leak into every one of them.
  it('drops an uncorrelated row', () => {
    const rows = [row({ correlationId: '' })];

    expect(filterRowsByInvestigation({ investigationId: '', rows })).toEqual([]);
    expect(filterRowsByInvestigation({ investigationId: 'ad-1', rows })).toEqual([]);
  });

  it('keeps every row for the same discovery, one per gate', () => {
    const rows = [row(), row({ gateId: 'promote_incident', sourceId: 'src-2' })];

    expect(filterRowsByInvestigation({ investigationId: 'ad-1', rows })).toEqual(rows);
  });

  it('does not match the thread conversation id, which addresses a proposal rather than an investigation', () => {
    const rows = [row({ threadConversationId: 'a1c2022a-57ea-5afa-a7fa-c85ff30b0001' })];

    expect(
      filterRowsByInvestigation({
        investigationId: 'a1c2022a-57ea-5afa-a7fa-c85ff30b0001',
        rows,
      })
    ).toEqual([]);
  });
});
