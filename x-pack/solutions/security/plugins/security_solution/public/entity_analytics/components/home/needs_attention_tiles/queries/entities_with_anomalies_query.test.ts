/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';
import { buildEntitiesWithAnomaliesCountQuery } from './entities_with_anomalies_query';

const mockEuid = {
  esql: {
    getFieldEvaluations: () => undefined,
    getEuidEvaluation: (_type: string, varName: string) => `${varName} = "mock_euid"`,
  },
} as unknown as EntityStoreEuid;

describe('buildEntitiesWithAnomaliesCountQuery', () => {
  it('queries the ML anomalies index', () => {
    const query = buildEntitiesWithAnomaliesCountQuery(mockEuid, '.entities-v1');
    expect(query).toContain('FROM .ml-anomalies-shared*');
  });

  it('filters to real, non-interim records above the score threshold', () => {
    const query = buildEntitiesWithAnomaliesCountQuery(mockEuid, '.entities-v1');
    expect(query).toContain('result_type == "record"');
    expect(query).toContain('is_interim == false');
    expect(query).toContain('record_score >= 1');
  });

  it('deduplicates via STATS BY derived_euids before the LOOKUP JOIN, then renames to entity.id', () => {
    const query = buildEntitiesWithAnomaliesCountQuery(mockEuid, '.entities-v1');
    const statsIdx = query.indexOf('| STATS BY derived_euids');
    const renameIdx = query.indexOf('| RENAME derived_euids AS `entity.id`');
    const joinIdx = query.indexOf('| LOOKUP JOIN .entities-v1');
    expect(statsIdx).toBeGreaterThan(-1);
    expect(renameIdx).toBeGreaterThan(statsIdx);
    expect(joinIdx).toBeGreaterThan(renameIdx);
  });

  it('picks the first non-null EUID via COALESCE across entity types', () => {
    const query = buildEntitiesWithAnomaliesCountQuery(mockEuid, '.entities-v1');
    expect(query).toContain('| EVAL derived_euids = COALESCE(user_euid, host_euid, service_euid)');
  });

  it('applies entity filter clauses after the LOOKUP JOIN', () => {
    const filter = '| WHERE entity.type == "host"';
    const query = buildEntitiesWithAnomaliesCountQuery(mockEuid, '.entities-v1', '24h', [filter]);
    const joinIdx = query.indexOf('| LOOKUP JOIN');
    const filterIdx = query.indexOf(filter);
    expect(filterIdx).toBeGreaterThan(joinIdx);
  });

  it('uses the provided time range', () => {
    const query = buildEntitiesWithAnomaliesCountQuery(mockEuid, '.entities-v1', '7d');
    expect(query).toContain('@timestamp >= NOW() - 7d');
  });

  it('defaults to 24h when no time range is given', () => {
    const query = buildEntitiesWithAnomaliesCountQuery(mockEuid, '.entities-v1');
    expect(query).toContain('@timestamp >= NOW() - 24h');
  });
});
