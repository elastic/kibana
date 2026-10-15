/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildNewlyHighCriticalCountQuery } from './tile_newly_high_critical_query';

describe('buildNewlyHighCriticalCountQuery', () => {
  it('emits the unmapped_fields nullify pragma to handle sparse entity-type indices', () => {
    const query = buildNewlyHighCriticalCountQuery('default', '.entities-v1');
    expect(query).toContain('SET unmapped_fields="nullify"');
  });

  it('queries the space-scoped risk score history index', () => {
    const query = buildNewlyHighCriticalCountQuery('my-space', '.entities-v1');
    expect(query).toContain('FROM risk-score.risk-score-my-space');
  });

  it('reads only the two hours of risk score docs before the boundary of each time range', () => {
    expect(buildNewlyHighCriticalCountQuery('default', '.entities-v1', '24h')).toContain(
      '@timestamp >= NOW() - 1 days - 2 hours AND @timestamp <= NOW() - 1 days'
    );
    expect(buildNewlyHighCriticalCountQuery('default', '.entities-v1', '7d')).toContain(
      '@timestamp >= NOW() - 7 days - 2 hours AND @timestamp <= NOW() - 7 days'
    );
    expect(buildNewlyHighCriticalCountQuery('default', '.entities-v1', '30d')).toContain(
      '@timestamp >= NOW() - 30 days - 2 hours AND @timestamp <= NOW() - 30 days'
    );
  });

  it('reads the current level from the High and Critical entity docs', () => {
    const query = buildNewlyHighCriticalCountQuery('default', '.entities-v1');
    expect(query).toContain('FROM .entities-v1');
    expect(query).toContain('WHERE entity.risk.calculated_level IN ("High", "Critical")');
    expect(query).toContain(
      'current_level_num = CASE(entity.risk.calculated_level == "Critical", 4, 3)'
    );
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

  it('qualifies entities whose level is strictly higher than at the boundary, or had none', () => {
    const query = buildNewlyHighCriticalCountQuery('default', '.entities-v1');
    // High to Critical counts; Critical to Critical and Critical to High do not.
    expect(query).toContain('boundary_level_num IS NULL OR current_level_num > boundary_level_num');
    expect(query).not.toContain('boundary_level_num < 3');
  });

  it('maps risk levels to numbers with nested single-condition CASEs', () => {
    const query = buildNewlyHighCriticalCountQuery('default', '.entities-v1');
    expect(query).toContain('level_low = CASE(risk_level == "Low", 1, 0)');
    expect(query).toContain('level_moderate = CASE(risk_level == "Moderate", 2, level_low)');
    expect(query).toContain('level_high = CASE(risk_level == "High", 3, level_moderate)');
    expect(query).toContain('level_num = CASE(risk_level == "Critical", 4, level_high)');
  });

  it('uses LAST(level_num, @timestamp) not MAX to record the actual level at the boundary', () => {
    const query = buildNewlyHighCriticalCountQuery('default', '.entities-v1');
    expect(query).toContain(
      'STATS boundary_level_num = LAST(level_num, @timestamp) BY entity_euid'
    );
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
    const query = buildNewlyHighCriticalCountQuery('default', '.entities-v1', '24h', [filter]);
    const joinIdx = query.indexOf('| LOOKUP JOIN');
    const filterIdx = query.indexOf(filter);
    expect(filterIdx).toBeGreaterThan(joinIdx);
  });

  it('defaults to 24h when no time range is supplied', () => {
    const query = buildNewlyHighCriticalCountQuery('default', '.entities-v1');
    expect(query).toContain('@timestamp <= NOW() - 1 days');
  });

  it('deduplicates resolved entities and emits both value and entity_ids columns', () => {
    const query = buildNewlyHighCriticalCountQuery('default', '.entities-v1');
    expect(query).toContain('COALESCE(`entity.relationships.resolution.resolved_to`, entity.id)');
    expect(query).toContain('value = COUNT_DISTINCT(effective_id)');
    expect(query).toContain('entity_ids = VALUES(effective_id)');
  });
});
