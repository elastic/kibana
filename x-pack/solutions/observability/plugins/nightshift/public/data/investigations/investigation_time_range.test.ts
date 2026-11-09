/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { matchesInvestigationUpdatedAtRange } from './investigation_time_range';

const investigation = (updatedAt: string): InvestigationSummary => ({
  id: 'i-1',
  title: 'Checkout',
  title_pending: false,
  created_at: updatedAt,
  updated_at: updatedAt,
  agent_id: 'nightshift.investigation',
  metadata: { status: 'open' },
  in_progress: false,
  subjects: [],
});

describe('matchesInvestigationUpdatedAtRange', () => {
  it('keeps investigations updated inside the absolute range', () => {
    expect(
      matchesInvestigationUpdatedAtRange(
        investigation('2026-11-05T12:00:00.000Z'),
        '2026-11-01T00:00:00.000Z',
        '2026-11-06T00:00:00.000Z'
      )
    ).toBe(true);
  });

  it('drops investigations updated outside the absolute range', () => {
    expect(
      matchesInvestigationUpdatedAtRange(
        investigation('2026-10-01T12:00:00.000Z'),
        '2026-11-01T00:00:00.000Z',
        '2026-11-06T00:00:00.000Z'
      )
    ).toBe(false);
  });
});
