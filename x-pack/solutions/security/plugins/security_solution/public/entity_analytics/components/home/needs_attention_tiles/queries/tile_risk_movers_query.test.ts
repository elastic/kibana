/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRiskMoversCountQuery } from './tile_risk_movers_query';

describe('buildRiskMoversCountQuery', () => {
  it('emits the unmapped_fields nullify pragma to handle sparse entity-type indices', () => {
    const query = buildRiskMoversCountQuery('default', '.entities-v1');
    expect(query).toContain('SET unmapped_fields="nullify"');
  });

  it('queries the space-scoped risk score history index', () => {
    const query = buildRiskMoversCountQuery('my-space', '.entities-v1');
    expect(query).toContain('FROM risk-score.risk-score-my-space');
  });

  it('reads only the two hours of risk score docs before the boundary of each time range', () => {
    expect(buildRiskMoversCountQuery('default', '.entities-v1', '24h')).toContain(
      '@timestamp >= NOW() - 1 days - 2 hours AND @timestamp <= NOW() - 1 days'
    );
    expect(buildRiskMoversCountQuery('default', '.entities-v1', '7d')).toContain(
      '@timestamp >= NOW() - 7 days - 2 hours AND @timestamp <= NOW() - 7 days'
    );
    expect(buildRiskMoversCountQuery('default', '.entities-v1', '30d')).toContain(
      '@timestamp >= NOW() - 30 days - 2 hours AND @timestamp <= NOW() - 30 days'
    );
  });

  it('uses LAST(risk_score, @timestamp) not MAX to get the actual snapshot at the boundary', () => {
    const query = buildRiskMoversCountQuery('default', '.entities-v1');
    expect(query).toContain('STATS boundary_score = LAST(risk_score, @timestamp) BY entity_euid');
    expect(query).not.toMatch(/MAX\(risk_score/);
  });

  it('compares the entity doc score to the boundary score, after merging both by entity.id', () => {
    const query = buildRiskMoversCountQuery('default', '.entities-v1');
    const mergeIdx = query.indexOf('| STATS boundary_score = MAX(boundary_score),');
    const riseIdx = query.indexOf('| WHERE current_score - boundary_score >= 10');
    expect(mergeIdx).toBeGreaterThan(-1);
    expect(riseIdx).toBeGreaterThan(mergeIdx);
    expect(query).not.toContain('LOOKUP JOIN');
  });

  it('reads the current score from the scored entity docs', () => {
    const query = buildRiskMoversCountQuery('default', '.entities-v1');
    expect(query).toContain('  FROM .entities-v1');
    expect(query).toContain(
      '  | WHERE entity.risk.calculated_score_norm IS NOT NULL AND entity.name IS NOT NULL'
    );
    expect(query).toContain('current_score = entity.risk.calculated_score_norm');
  });

  it('derives entity_euid from all three entity types via COALESCE', () => {
    const query = buildRiskMoversCountQuery('default', '.entities-v1');
    expect(query).toContain(
      'COALESCE(host.risk.id_value, user.risk.id_value, service.risk.id_value)'
    );
  });

  it('derives risk_score from the normalised score field across all three entity types', () => {
    const query = buildRiskMoversCountQuery('default', '.entities-v1');
    expect(query).toContain(
      'COALESCE(host.risk.calculated_score_norm, user.risk.calculated_score_norm, service.risk.calculated_score_norm)'
    );
  });

  it('renames entity_euid to entity.id in the boundary branch', () => {
    const query = buildRiskMoversCountQuery('default', '.entities-v1');
    expect(query).toContain('  | RENAME entity_euid AS `entity.id`');
  });

  it('applies entity filter clauses to the entity branch', () => {
    const filter = '| WHERE entity.EngineMetadata.Type == "host"';
    const query = buildRiskMoversCountQuery('default', '.entities-v1', '24h', [filter]);
    const entityBranchIdx = query.indexOf('  FROM .entities-v1');
    const filterIdx = query.indexOf(`  ${filter}`);
    const mergeIdx = query.indexOf('| STATS boundary_score = MAX(boundary_score),');
    expect(filterIdx).toBeGreaterThan(entityBranchIdx);
    expect(filterIdx).toBeLessThan(mergeIdx);
  });

  it('defaults to 24h when no time range is supplied', () => {
    const query = buildRiskMoversCountQuery('default', '.entities-v1');
    expect(query).toContain('@timestamp <= NOW() - 1 days');
  });

  it('deduplicates resolved entities and emits both value and entity_ids columns', () => {
    const query = buildRiskMoversCountQuery('default', '.entities-v1');
    expect(query).toContain('COALESCE(`entity.relationships.resolution.resolved_to`, entity.id)');
    expect(query).toContain('value = COUNT_DISTINCT(effective_id)');
    expect(query).toContain('entity_ids = VALUES(effective_id)');
  });
});
