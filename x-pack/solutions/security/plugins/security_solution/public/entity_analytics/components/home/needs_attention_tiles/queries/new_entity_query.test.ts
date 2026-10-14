/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildNewEntityCountQuery } from './new_entity_query';

// The expected text of the query: the tile's rule, then one row per resolved entity, then an exact count.
const expected = (range: string, filters: string[] = []) =>
  [
    'FROM .entities-v1',
    `| WHERE entity.lifecycle.first_seen >= NOW() - ${range} AND entity.risk.calculated_score > 0`,
    ...filters,
    '| EVAL effective_id = COALESCE(`entity.relationships.resolution.resolved_to`, entity.id)',
    '| STATS entity_ids = VALUES(entity.id) BY effective_id',
    '| STATS value = COUNT(effective_id), entity_ids = VALUES(entity_ids)',
  ].join('\n');

describe('buildNewEntityCountQuery', () => {
  it('counts the resolved entities with a plain COUNT, not the approximate COUNT_DISTINCT', () => {
    const query = buildNewEntityCountQuery('.entities-v1');
    expect(query).not.toContain('COUNT_DISTINCT');
    expect(query.indexOf('BY effective_id')).toBeLessThan(query.indexOf('value = COUNT('));
  });

  it('keeps every entity.id of each resolved entity in the id list', () => {
    expect(buildNewEntityCountQuery('.entities-v1')).toContain(
      'entity_ids = VALUES(entity.id) BY effective_id'
    );
  });

  it.each([
    ['24h', '24 hours'],
    ['7d', '7 days'],
    ['30d', '30 days'],
  ] as const)('builds the query for %s', (timeRange, range) => {
    expect(buildNewEntityCountQuery('.entities-v1', timeRange)).toBe(expected(range));
  });

  it('defaults to 7 days', () => {
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

  // Before the first STATS the previous period is the current query with its own first_seen window.
  const upToFirstStats = (query: string) => query.slice(0, query.indexOf('| STATS'));

  it('changes nothing before the counts but the first_seen condition', () => {
    const filters = ['| WHERE x'];
    const current = buildNewEntityCountQuery('.entities-v1', '7d', filters, 'current');
    const previous = buildNewEntityCountQuery('.entities-v1', '7d', filters, 'previous');
    const withCurrentCondition = previous.replace(
      'entity.lifecycle.first_seen >= NOW() - 14 days AND entity.lifecycle.first_seen < NOW() - 7 days',
      'entity.lifecycle.first_seen >= NOW() - 7 days'
    );
    expect(upToFirstStats(withCurrentCondition)).toBe(upToFirstStats(current));
  });

  it('counts only: the previous period leaves out the entity id list the current one returns', () => {
    const current = buildNewEntityCountQuery('.entities-v1', '7d', [], 'current');
    const previous = buildNewEntityCountQuery('.entities-v1', '7d', [], 'previous');
    expect(current).toContain('entity_ids = VALUES(entity.id) BY effective_id');
    expect(previous).not.toContain('VALUES');
    expect(previous).not.toContain('entity_ids');
    expect(previous.endsWith('| STATS BY effective_id\n| STATS value = COUNT(effective_id)')).toBe(
      true
    );
  });
});
