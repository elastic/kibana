/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import {
  DEFAULT_INVESTIGATIONS_TABLE_SORT,
  sortInvestigationsForTable,
} from './investigations_table_sort';

const makeInvestigation = (
  id: string,
  overrides: Partial<InvestigationSummary> & {
    title?: string;
    severity?: InvestigationSummary['metadata']['severity'];
    status?: 'open' | 'closed';
    in_progress?: boolean;
    updated_at?: string;
  } = {}
): InvestigationSummary => ({
  id,
  title: overrides.title ?? id,
  title_pending: false,
  created_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
  updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
  agent_id: 'nightshift.investigation',
  metadata: {
    status: overrides.status ?? 'open',
    severity: overrides.severity,
    summary: `${id} summary`,
  },
  in_progress: overrides.in_progress ?? false,
  subjects: [],
});

describe('sortInvestigationsForTable', () => {
  it('defaults to newest last-updated first', () => {
    const older = makeInvestigation('older', { updated_at: '2026-01-01T00:00:00.000Z' });
    const newer = makeInvestigation('newer', { updated_at: '2026-02-01T00:00:00.000Z' });

    expect(
      sortInvestigationsForTable([older, newer], DEFAULT_INVESTIGATIONS_TABLE_SORT).map(
        ({ id }) => id
      )
    ).toEqual(['newer', 'older']);
  });

  it('sorts by title ascending', () => {
    const beta = makeInvestigation('b', { title: 'Beta' });
    const alpha = makeInvestigation('a', { title: 'Alpha' });

    expect(
      sortInvestigationsForTable([beta, alpha], { field: 'title', direction: 'asc' }).map(
        ({ title }) => title
      )
    ).toEqual(['Alpha', 'Beta']);
  });

  it('sorts by severity critical → none', () => {
    const low = makeInvestigation('low', { severity: 'low' });
    const critical = makeInvestigation('critical', { severity: 'critical' });
    const none = makeInvestigation('none');

    expect(
      sortInvestigationsForTable([low, none, critical], {
        field: 'severity',
        direction: 'asc',
      }).map(({ id }) => id)
    ).toEqual(['critical', 'low', 'none']);
  });

  it('sorts by state open before closed', () => {
    const open = makeInvestigation('open', { status: 'open' });
    const closed = makeInvestigation('closed', { status: 'closed' });

    expect(
      sortInvestigationsForTable([closed, open], { field: 'state', direction: 'asc' }).map(
        ({ id }) => id
      )
    ).toEqual(['open', 'closed']);
  });
});
