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

describe('buildNewEntityCountQuery for the previous period', () => {
  it.each(['24h', '7d', '30d'] as const)(
    'builds the same query when the current period is passed explicitly for %s',
    (range) => {
      expect(buildNewEntityCountQuery('.entities-v1', range, [], 'current')).toBe(
        buildNewEntityCountQuery('.entities-v1', range)
      );
    }
  );

  it.each([
    ['24h', '48 hours', '24 hours'],
    ['7d', '14 days', '7 days'],
    ['30d', '60 days', '30 days'],
  ] as const)('keeps first_seen inside [2 x range, range) ago for %s', (range, from, to) => {
    expect(buildNewEntityCountQuery('.entities-v1', range, [], 'previous')).toContain(
      `| WHERE entity.lifecycle.first_seen >= NOW() - ${from} AND entity.lifecycle.first_seen < NOW() - ${to} AND entity.risk.calculated_score > 0`
    );
  });

  it('changes nothing but the first_seen condition', () => {
    const filters = ['| WHERE x'];
    const current = buildNewEntityCountQuery('.entities-v1', '7d', filters, 'current');
    const previous = buildNewEntityCountQuery('.entities-v1', '7d', filters, 'previous');
    expect(
      previous.replace(
        'entity.lifecycle.first_seen >= NOW() - 14 days AND entity.lifecycle.first_seen < NOW() - 7 days',
        'entity.lifecycle.first_seen >= NOW() - 7 days'
      )
    ).toBe(current);
  });
});
