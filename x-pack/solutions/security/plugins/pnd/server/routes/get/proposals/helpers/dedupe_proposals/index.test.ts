/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndProposalRow } from '@kbn/pnd-common';
import { dedupeProposals } from '.';

const row = (overrides: Partial<PndProposalRow>): PndProposalRow =>
  ({
    alwaysGate: false,
    correlationId: 'ad-1',
    createdAt: '2026-08-02T00:00:00.000Z',
    gateId: 'open_investigation',
    inputSchema: {},
    message: '',
    reasoning: '',
    recommendedAction: 'investigate',
    reversible: true,
    sourceId: 'wf:run:step',
    stepExecutionId: 'step',
    stepId: 'await_open_investigation',
    title: '',
    workflowId: 'wf',
    workflowRunId: 'run',
    ...overrides,
  } as PndProposalRow);

describe('dedupeProposals', () => {
  it('collapses duplicates sharing an attack-discovery id and gate id', () => {
    const rows = dedupeProposals([
      row({ createdAt: '2026-08-02T00:00:00.000Z', sourceId: 'wf:run-1:step' }),
      row({ createdAt: '2026-08-02T01:00:00.000Z', sourceId: 'wf:run-2:step' }),
    ]);

    expect(rows).toHaveLength(1);
  });

  it('keeps the newest of a duplicate pair', () => {
    const rows = dedupeProposals([
      row({ createdAt: '2026-08-02T00:00:00.000Z', sourceId: 'wf:run-1:step' }),
      row({ createdAt: '2026-08-02T01:00:00.000Z', sourceId: 'wf:run-2:step' }),
    ]);

    expect(rows[0].sourceId).toEqual('wf:run-2:step');
  });

  it('keeps rows with the same discovery but different gates', () => {
    const rows = dedupeProposals([
      row({ gateId: 'open_investigation' }),
      row({ gateId: 'promote_incident' }),
    ]);

    expect(rows).toHaveLength(2);
  });

  it('keeps rows with the same gate but different discoveries', () => {
    const rows = dedupeProposals([row({ correlationId: 'ad-1' }), row({ correlationId: 'ad-2' })]);

    expect(rows).toHaveLength(2);
  });

  it('never collapses uncorrelated rows with an empty discovery id', () => {
    const rows = dedupeProposals([
      row({ correlationId: '', sourceId: 'wf:run-1:step' }),
      row({ correlationId: '', sourceId: 'wf:run-2:step' }),
    ]);

    expect(rows).toHaveLength(2);
  });

  it('returns newest-first order overall', () => {
    const rows = dedupeProposals([
      row({ correlationId: 'ad-1', createdAt: '2026-08-02T00:00:00.000Z' }),
      row({ correlationId: 'ad-2', createdAt: '2026-08-02T02:00:00.000Z' }),
    ]);

    expect(rows.map((r) => r.correlationId)).toEqual(['ad-2', 'ad-1']);
  });
});
