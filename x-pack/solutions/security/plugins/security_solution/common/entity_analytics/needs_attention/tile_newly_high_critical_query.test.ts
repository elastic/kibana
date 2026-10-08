/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildNewlyHighCriticalCountQuery,
  newlyHighCriticalWindow,
} from './tile_newly_high_critical_query';

describe('buildNewlyHighCriticalCountQuery', () => {
  it('emits the unmapped_fields nullify pragma to handle sparse entity-type indices', () => {
    const query = buildNewlyHighCriticalCountQuery('default', '.entities-v1');
    expect(query).toContain('SET unmapped_fields="nullify"');
  });

  it('queries the space-scoped risk score history index', () => {
    const query = buildNewlyHighCriticalCountQuery('my-space', '.entities-v1');
    expect(query).toContain('FROM risk-score.risk-score-my-space');
  });

  it('fetches a window wider than the period so both sides of the boundary are covered', () => {
    const query24h = buildNewlyHighCriticalCountQuery(
      'default',
      '.entities-v1',
      newlyHighCriticalWindow('24h')
    );
    const query7d = buildNewlyHighCriticalCountQuery(
      'default',
      '.entities-v1',
      newlyHighCriticalWindow('7d')
    );
    const query30d = buildNewlyHighCriticalCountQuery(
      'default',
      '.entities-v1',
      newlyHighCriticalWindow('30d')
    );
    expect(query24h).toContain('@timestamp >= NOW() - 26h');
    expect(query7d).toContain('@timestamp >= NOW() - 170h');
    expect(query30d).toContain('@timestamp >= NOW() - 722h');
  });

  it('labels docs as "boundary" or "current" using the correct period cutoff for each time range', () => {
    expect(
      buildNewlyHighCriticalCountQuery('default', '.entities-v1', newlyHighCriticalWindow('24h'))
    ).toContain('CASE(@timestamp <= NOW() - 24h, "boundary", "current")');
    expect(
      buildNewlyHighCriticalCountQuery('default', '.entities-v1', newlyHighCriticalWindow('7d'))
    ).toContain('CASE(@timestamp <= NOW() - 7d, "boundary", "current")');
    expect(
      buildNewlyHighCriticalCountQuery('default', '.entities-v1', newlyHighCriticalWindow('30d'))
    ).toContain('CASE(@timestamp <= NOW() - 30d, "boundary", "current")');
  });

  it('maps risk levels to integers so MAX produces the correct ordinal comparison', () => {
    const query = buildNewlyHighCriticalCountQuery('default', '.entities-v1');
    expect(query).toContain('risk_level == "Critical", 4');
    expect(query).toContain('risk_level == "High", 3');
    expect(query).toContain('risk_level == "Moderate", 2');
    expect(query).toContain('risk_level == "Low", 1, 0)');
  });

  it('derives entity_euid from all three entity types via COALESCE', () => {
    const query = buildNewlyHighCriticalCountQuery('default', '.entities-v1');
    expect(query).toContain(
      'COALESCE(host.risk.id_value, user.risk.id_value, service.risk.id_value)'
    );
  });

  it('derives risk_level from all three entity types via COALESCE', () => {
    const query = buildNewlyHighCriticalCountQuery('default', '.entities-v1');
    expect(query).toContain(
      'COALESCE(host.risk.calculated_level, user.risk.calculated_level, service.risk.calculated_level)'
    );
  });

  it('qualifies entities that are currently High or Critical (level >= 3)', () => {
    const query = buildNewlyHighCriticalCountQuery('default', '.entities-v1');
    expect(query).toContain('current_level_num >= 3');
  });

  it('excludes entities that were already High or Critical at the boundary', () => {
    const query = buildNewlyHighCriticalCountQuery('default', '.entities-v1');
    expect(query).toContain('boundary_level_num IS NULL OR boundary_level_num < 3');
  });

  it('uses LAST(level_num, @timestamp) not MAX to record the actual level at each boundary', () => {
    const query = buildNewlyHighCriticalCountQuery('default', '.entities-v1');
    expect(query).toContain('STATS level_num = LAST(level_num, @timestamp) BY entity_euid, period');
    expect(query).not.toMatch(/MAX\(level_num/);
  });

  it('renames entity_euid to entity.id before the LOOKUP JOIN', () => {
    const query = buildNewlyHighCriticalCountQuery('default', '.entities-v1');
    const renameIdx = query.indexOf('| RENAME entity_euid AS `entity.id`');
    const joinIdx = query.indexOf('| LOOKUP JOIN .entities-v1');
    expect(renameIdx).toBeGreaterThan(-1);
    expect(joinIdx).toBeGreaterThan(renameIdx);
  });

  it('drops risk-history rows with no matching entity-latest record after the LOOKUP JOIN', () => {
    const query = buildNewlyHighCriticalCountQuery('default', '.entities-v1');
    const joinIdx = query.indexOf('| LOOKUP JOIN .entities-v1');
    const dropIdx = query.indexOf('| WHERE entity.name IS NOT NULL');
    expect(joinIdx).toBeGreaterThan(-1);
    expect(dropIdx).toBeGreaterThan(joinIdx);
  });

  it('applies entity filter clauses after the LOOKUP JOIN', () => {
    const filter = '| WHERE entity.type == "host"';
    const query = buildNewlyHighCriticalCountQuery(
      'default',
      '.entities-v1',
      newlyHighCriticalWindow('24h'),
      [filter]
    );
    const joinIdx = query.indexOf('| LOOKUP JOIN');
    const filterIdx = query.indexOf(filter);
    expect(filterIdx).toBeGreaterThan(joinIdx);
  });

  it('defaults to 24h when no time range is supplied', () => {
    const query = buildNewlyHighCriticalCountQuery('default', '.entities-v1');
    expect(query).toContain('@timestamp >= NOW() - 26h');
    expect(query).toContain('CASE(@timestamp <= NOW() - 24h');
  });

  it('deduplicates resolved entities and emits both value and entity_ids columns', () => {
    const query = buildNewlyHighCriticalCountQuery('default', '.entities-v1');
    expect(query).toContain('COALESCE(`entity.relationships.resolution.resolved_to`, entity.id)');
    expect(query).toContain('value = COUNT_DISTINCT(effective_id)');
    expect(query).toContain('entity_ids = VALUES(entity.id)');
  });
});
