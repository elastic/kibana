/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEntitiesWithAnomaliesCountQuery } from './entities_with_anomalies_query';

describe('buildEntitiesWithAnomaliesCountQuery', () => {
  it('queries the ML anomalies index', () => {
    const query = buildEntitiesWithAnomaliesCountQuery('.entities-v1');
    expect(query).toContain('FROM .ml-anomalies-shared*');
  });

  it('filters to real, non-interim records above the score threshold', () => {
    const query = buildEntitiesWithAnomaliesCountQuery('.entities-v1');
    expect(query).toContain('result_type == "record"');
    expect(query).toContain('is_interim == false');
    expect(query).toContain('record_score >= 1');
  });

  it('deduplicates via STATS BY derived_euids before the LOOKUP JOIN, then renames to entity.id', () => {
    const query = buildEntitiesWithAnomaliesCountQuery('.entities-v1');
    const statsIdx = query.indexOf('| STATS BY derived_euids');
    const renameIdx = query.indexOf('| RENAME derived_euids AS `entity.id`');
    const joinIdx = query.indexOf('| LOOKUP JOIN .entities-v1');
    expect(statsIdx).toBeGreaterThan(-1);
    expect(renameIdx).toBeGreaterThan(statsIdx);
    expect(joinIdx).toBeGreaterThan(renameIdx);
  });

  it('combines present EUIDs with guarded MV_APPEND so multi-entity records keep every type', () => {
    const query = buildEntitiesWithAnomaliesCountQuery('.entities-v1');
    // One COALESCE per type order, appended and deduplicated: every present type survives.
    expect(query).toContain('derived_euids = MV_DEDUPE(MV_APPEND(MV_APPEND(');
    expect(query).toContain('COALESCE(user_euid, host_euid, service_euid)');
    expect(query).toContain('COALESCE(host_euid, service_euid, user_euid)');
    expect(query).toContain('COALESCE(service_euid, user_euid, host_euid)');
    expect(query).not.toContain('derived_euids = COALESCE(');
  });

  it('restricts the shared ML index to the supplied job IDs before the entity lookup', () => {
    const query = buildEntitiesWithAnomaliesCountQuery(
      '.entities-v1',
      '24h',
      [],
      ['job-a', 'job-b']
    );
    const jobPredicate = 'job_id IN ("job-a", "job-b")';
    const whereIdx = query.indexOf(jobPredicate);
    const joinIdx = query.indexOf('| LOOKUP JOIN');
    expect(whereIdx).toBeGreaterThan(-1);
    expect(joinIdx).toBeGreaterThan(whereIdx);
  });

  it('applies entity filter clauses after the LOOKUP JOIN', () => {
    const filter = '| WHERE entity.type == "host"';
    const query = buildEntitiesWithAnomaliesCountQuery('.entities-v1', '24h', [filter]);
    const joinIdx = query.indexOf('| LOOKUP JOIN');
    const filterIdx = query.indexOf(filter);
    expect(filterIdx).toBeGreaterThan(joinIdx);
  });

  it('uses the provided time range', () => {
    const query = buildEntitiesWithAnomaliesCountQuery('.entities-v1', '7d');
    expect(query).toContain('@timestamp >= NOW() - 7 days');
  });

  it('defaults to 24h when no time range is given', () => {
    const query = buildEntitiesWithAnomaliesCountQuery('.entities-v1');
    expect(query).toContain('@timestamp >= NOW() - 1 days');
  });
});
