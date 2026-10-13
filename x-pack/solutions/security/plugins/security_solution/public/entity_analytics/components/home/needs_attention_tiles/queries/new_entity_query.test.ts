/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildNewEntityCountQuery } from './new_entity_query';

// The expected text is the query exactly as the hook built it inline before it moved here.
const expected = (range: string, filters: string[] = []) =>
  [
    'FROM .entities-v1',
    `| WHERE entity.lifecycle.first_seen >= NOW() - ${range} AND entity.risk.calculated_score > 0`,
    ...filters,
    '| EVAL effective_id = COALESCE(`entity.relationships.resolution.resolved_to`, entity.id)',
    '| STATS value = COUNT_DISTINCT(effective_id), entity_ids = VALUES(entity.id)',
  ].join('\n');

describe('buildNewEntityCountQuery', () => {
  it.each([
    ['24h', '24 hours'],
    ['7d', '7 days'],
    ['30d', '30 days'],
  ] as const)('builds the query for %s as the hook did before it moved', (timeRange, range) => {
    expect(buildNewEntityCountQuery('.entities-v1', timeRange)).toBe(expected(range));
  });

  it('defaults to 7 days, as the hook did', () => {
    expect(buildNewEntityCountQuery('.entities-v1')).toBe(expected('7 days'));
  });

  it('puts the entity filter clauses after the time condition and before the resolution', () => {
    const filters = ['| WHERE entity.type == "user"', '| WHERE asset.criticality == "high_impact"'];
    expect(buildNewEntityCountQuery('.entities-v1', '30d', filters)).toBe(
      expected('30 days', filters)
    );
  });
});
