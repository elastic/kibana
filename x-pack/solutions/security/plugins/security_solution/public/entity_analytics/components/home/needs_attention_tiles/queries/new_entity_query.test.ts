/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildNewEntityCountQuery } from './new_entity_query';

// The expected text of the query: the main entities first seen since the window start, every alias,
// the group's rule on the merged rows, then one row per group and an exact count.
const expected = (range: string, filters: string[] = []) =>
  [
    'SET unmapped_fields="nullify";',
    'FROM (',
    '  FROM .entities-v1',
    `  | WHERE \`entity.relationships.resolution.resolved_to\` IS NULL AND entity.lifecycle.first_seen >= NOW() - ${range} AND (entity.risk.calculated_score > 0 OR \`entity.relationships.resolution.risk.calculated_score\` > 0)`,
    '  | WHERE entity.name IS NOT NULL',
    ...filters.map((filter) => `  ${filter}`),
    '  | EVAL group_score = COALESCE(`entity.relationships.resolution.risk.calculated_score`, entity.risk.calculated_score)',
    '  | KEEP entity.id, entity.lifecycle.first_seen, group_score',
    '), (',
    '  FROM .entities-v1',
    '  | WHERE `entity.relationships.resolution.resolved_to` IS NOT NULL',
    '  | EVAL entity.id = `entity.relationships.resolution.resolved_to`, alias_first_seen = entity.lifecycle.first_seen',
    '  | KEEP entity.id, alias_first_seen',
    ')',
    '| STATS main_first_seen = MIN(entity.lifecycle.first_seen), alias_first_seen = MIN(alias_first_seen), group_score = MAX(group_score) BY entity.id',
    '| EVAL group_first_seen = CASE(alias_first_seen < main_first_seen, alias_first_seen, main_first_seen)',
    `| WHERE group_first_seen >= NOW() - ${range} AND group_score > 0`,
    '| EVAL effective_id = entity.id',
    '| STATS value = COUNT(effective_id), entity_ids = VALUES(effective_id)',
  ].join('\n');

describe('buildNewEntityCountQuery', () => {
  it('counts the resolved entities with a plain COUNT, not the approximate COUNT_DISTINCT', () => {
    const query = buildNewEntityCountQuery('.entities-v1');
    expect(query).not.toContain('COUNT_DISTINCT');
    expect(query.indexOf('BY effective_id')).toBeLessThan(query.indexOf('value = COUNT('));
  });

  it('returns the main entity id of each group in the id list', () => {
    expect(buildNewEntityCountQuery('.entities-v1')).toContain('entity_ids = VALUES(effective_id)');
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

  it('puts the entity filter clauses on the main entities it reads, before the group rule', () => {
    const filters = ['| WHERE entity.type == "user"', '| WHERE asset.criticality == "high_impact"'];
    expect(buildNewEntityCountQuery('.entities-v1', '30d', filters)).toBe(
      expected('30 days', filters)
    );
  });
});

describe('buildNewEntityCountQuery judges a group by the group', () => {
  const query = buildNewEntityCountQuery('.entities-v1');

  it('reads every alias, whatever its age, so an old alias keeps the group from being new', () => {
    expect(query).toContain('| WHERE `entity.relationships.resolution.resolved_to` IS NOT NULL');
  });

  it('takes the earliest of the aliases and the main entity as the group first seen', () => {
    expect(query).toContain(
      'group_first_seen = CASE(alias_first_seen < main_first_seen, alias_first_seen, main_first_seen)'
    );
  });

  it('uses the group score above 0, else the entity own score', () => {
    expect(query).toContain(
      'group_score = COALESCE(`entity.relationships.resolution.risk.calculated_score`, entity.risk.calculated_score)'
    );
    expect(query).toContain('AND group_score > 0');
  });

  it('does not join the entity index, so a large store is not joined row by row', () => {
    expect(query).not.toContain('LOOKUP JOIN');
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
    const query = buildNewEntityCountQuery('.entities-v1', range, [], 'previous');
    // The main entities are read from the start of the previous period on, and the group is judged
    // by its first seen inside the previous period.
    expect(query).toContain(`entity.lifecycle.first_seen >= NOW() - ${from}`);
    expect(query).toContain(
      `| WHERE group_first_seen >= NOW() - ${from} AND group_first_seen < NOW() - ${to} AND group_score > 0`
    );
  });

  // Everything before the final counts is the current query with its own first_seen windows.
  const upToCounts = (query: string) => query.slice(0, query.lastIndexOf('| STATS'));

  it('changes nothing before the counts but the first_seen windows', () => {
    const filters = ['| WHERE x'];
    const current = buildNewEntityCountQuery('.entities-v1', '7d', filters, 'current');
    const previous = buildNewEntityCountQuery('.entities-v1', '7d', filters, 'previous');
    const withCurrentWindows = previous
      .replace(
        'entity.lifecycle.first_seen >= NOW() - 14 days',
        'entity.lifecycle.first_seen >= NOW() - 7 days'
      )
      .replace(
        'group_first_seen >= NOW() - 14 days AND group_first_seen < NOW() - 7 days',
        'group_first_seen >= NOW() - 7 days'
      );
    expect(upToCounts(withCurrentWindows)).toBe(upToCounts(current));
  });

  it('counts only: the previous period leaves out the entity id list the current one returns', () => {
    const current = buildNewEntityCountQuery('.entities-v1', '7d', [], 'current');
    const previous = buildNewEntityCountQuery('.entities-v1', '7d', [], 'previous');
    expect(current).toContain('entity_ids = VALUES(effective_id)');
    expect(previous).not.toContain('VALUES');
    expect(previous).not.toContain('entity_ids');
    expect(
      previous.endsWith('| EVAL effective_id = entity.id\n| STATS value = COUNT(effective_id)')
    ).toBe(true);
  });
});
