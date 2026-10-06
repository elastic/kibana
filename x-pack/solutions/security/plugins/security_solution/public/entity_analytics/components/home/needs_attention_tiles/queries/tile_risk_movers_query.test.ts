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
      '@timestamp >= NOW() - 24 hours - 2 hours AND @timestamp <= NOW() - 24 hours'
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

  it('compares the entity doc score to the boundary score, after the LOOKUP JOIN', () => {
    const query = buildRiskMoversCountQuery('default', '.entities-v1');
    const joinIdx = query.indexOf('| LOOKUP JOIN .entities-v1');
    const riseIdx = query.indexOf(
      '| WHERE entity.risk.calculated_score_norm - boundary_score >= 10'
    );
    expect(joinIdx).toBeGreaterThan(-1);
    expect(riseIdx).toBeGreaterThan(joinIdx);
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

  it('renames entity_euid to entity.id before the LOOKUP JOIN', () => {
    const query = buildRiskMoversCountQuery('default', '.entities-v1');
    const renameIdx = query.indexOf('| RENAME entity_euid AS `entity.id`');
    const joinIdx = query.indexOf('| LOOKUP JOIN .entities-v1');
    expect(renameIdx).toBeGreaterThan(-1);
    expect(joinIdx).toBeGreaterThan(renameIdx);
  });

  it('drops risk-history rows with no matching entity-latest record after the LOOKUP JOIN', () => {
    const query = buildRiskMoversCountQuery('default', '.entities-v1');
    const joinIdx = query.indexOf('| LOOKUP JOIN .entities-v1');
    const dropIdx = query.indexOf('| WHERE entity.name IS NOT NULL');
    expect(joinIdx).toBeGreaterThan(-1);
    expect(dropIdx).toBeGreaterThan(joinIdx);
  });

  it('applies entity filter clauses after the LOOKUP JOIN', () => {
    const filter = '| WHERE entity.type == "host"';
    const query = buildRiskMoversCountQuery('default', '.entities-v1', '24h', [filter]);
    const joinIdx = query.indexOf('| LOOKUP JOIN');
    const filterIdx = query.indexOf(filter);
    expect(filterIdx).toBeGreaterThan(joinIdx);
  });

  it('defaults to 24h when no time range is supplied', () => {
    const query = buildRiskMoversCountQuery('default', '.entities-v1');
    expect(query).toContain('@timestamp <= NOW() - 24 hours');
  });

  it('deduplicates resolved entities and emits both value and entity_ids columns', () => {
    const query = buildRiskMoversCountQuery('default', '.entities-v1');
    expect(query).toContain('COALESCE(`entity.relationships.resolution.resolved_to`, entity.id)');
    expect(query).toContain('value = COUNT_DISTINCT(effective_id)');
    expect(query).toContain('entity_ids = VALUES(effective_id)');
  });
});
