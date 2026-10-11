/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';
import { buildAlertBasedTilesQuery } from './entities_with_alerts_query';

const mockEuid = {
  esql: {
    getFieldEvaluations: () => undefined,
    getEuidEvaluation: (_type: string, varName: string) => `${varName} = "mock_euid"`,
  },
} as unknown as EntityStoreEuid;

describe('buildAlertBasedTilesQuery', () => {
  it('queries the correct alerts index for the given space', () => {
    const query = buildAlertBasedTilesQuery(mockEuid, '.entities-v1', 'my-space');
    expect(query).toContain('FROM .alerts-security.alerts-my-space');
  });

  it('deduplicates via STATS BY _ea_entity_id before the LOOKUP JOIN, then renames to entity.id', () => {
    const query = buildAlertBasedTilesQuery(mockEuid, '.entities-v1', 'default');
    const statsIdx = query.indexOf('| STATS BY _ea_entity_id');
    const renameIdx = query.indexOf('| RENAME _ea_entity_id AS `entity.id`');
    const joinIdx = query.indexOf('| LOOKUP JOIN .entities-v1');
    expect(statsIdx).toBeGreaterThan(-1);
    expect(renameIdx).toBeGreaterThan(statsIdx);
    expect(joinIdx).toBeGreaterThan(renameIdx);
  });

  it('outputs all four STATS columns for tile 1 and tile 5', () => {
    const query = buildAlertBasedTilesQuery(mockEuid, '.entities-v1', 'default');
    expect(query).toContain('alerts_count');
    expect(query).toContain('alerts_entity_ids');
    expect(query).toContain('watchlisted_count');
    expect(query).toContain('watchlisted_entity_ids');
  });

  it('uses null-masking so COUNT_DISTINCT/VALUES ignore non-watchlisted rows', () => {
    const query = buildAlertBasedTilesQuery(mockEuid, '.entities-v1', 'default');
    expect(query).toContain('CASE(is_watchlisted, effective_id, null)');
    expect(query).toContain('CASE(is_watchlisted, entity.id, null)');
  });

  it('applies entity filter clauses after the LOOKUP JOIN', () => {
    const filter = '| WHERE entity.type == "user"';
    const query = buildAlertBasedTilesQuery(mockEuid, '.entities-v1', 'default', '24h', [filter]);
    const joinIdx = query.indexOf('| LOOKUP JOIN');
    const filterIdx = query.indexOf(filter);
    expect(filterIdx).toBeGreaterThan(joinIdx);
  });

  it('uses the provided time range in the WHERE clause', () => {
    const query = buildAlertBasedTilesQuery(mockEuid, '.entities-v1', 'default', '7d');
    expect(query).toContain('@timestamp >= NOW() - 7d');
  });

  it('defaults to 24h when no time range is given', () => {
    const query = buildAlertBasedTilesQuery(mockEuid, '.entities-v1', 'default');
    expect(query).toContain('@timestamp >= NOW() - 24h');
  });
});
