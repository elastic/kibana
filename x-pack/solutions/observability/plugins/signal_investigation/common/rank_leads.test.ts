/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationLead } from '@kbn/signal-investigation-contract';
import { compareLeads, rankLeads } from './rank_leads';

const lead = (
  overrides: Partial<InvestigationLead> & Pick<InvestigationLead, 'id'>
): InvestigationLead => ({
  analyzerId: 'service_change_points',
  summary: overrides.id,
  relevance: 'Same service',
  ranking: { signal: 'weak', timing: 'during', relationship: 'service' },
  ...overrides,
});

describe('compareLeads', () => {
  it('ranks the same service above a dependency, and a change before the window above one after it', () => {
    const ranked = [
      lead({
        id: 'after',
        ranking: { signal: 'strong', timing: 'after', relationship: 'service' },
      }),
      lead({
        id: 'dependency',
        ranking: { signal: 'strong', timing: 'before', relationship: 'dependency' },
      }),
      lead({
        id: 'before',
        ranking: { signal: 'weak', timing: 'before', relationship: 'service' },
      }),
    ].sort(compareLeads);

    expect(ranked.map((item) => item.id)).toEqual(['before', 'after', 'dependency']);
  });

  it('uses signal strength only after relationship and timing agree', () => {
    const ranked = [
      lead({ id: 'weak', ranking: { signal: 'weak', timing: 'during', relationship: 'service' } }),
      lead({
        id: 'strong',
        ranking: { signal: 'strong', timing: 'during', relationship: 'service' },
      }),
    ].sort(compareLeads);

    expect(ranked.map((item) => item.id)).toEqual(['strong', 'weak']);
  });

  it('inserts a late analyzer result at its sorted position without changing existing lead ids', () => {
    const firstBatch = rankLeads([
      lead({
        id: 'dependency:redis:latency',
        analyzerId: 'dependency_change_points',
        ranking: { signal: 'strong', timing: 'during', relationship: 'dependency' },
      }),
      lead({
        id: 'log:checkout:timeout',
        analyzerId: 'log_change_points',
        ranking: { signal: 'moderate', timing: 'after', relationship: 'service' },
      }),
    ]);

    const withLateResult = rankLeads([
      ...firstBatch,
      lead({
        id: 'service:checkout:p95',
        analyzerId: 'service_change_points',
        ranking: { signal: 'strong', timing: 'before', relationship: 'service' },
      }),
    ]);

    expect(withLateResult.map((item) => item.id)).toEqual([
      'service:checkout:p95',
      'log:checkout:timeout',
      'dependency:redis:latency',
    ]);
  });
});
