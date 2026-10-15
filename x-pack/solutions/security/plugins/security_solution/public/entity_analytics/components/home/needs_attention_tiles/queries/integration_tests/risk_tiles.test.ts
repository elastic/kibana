/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY_ENTITY_FILTERS } from '../../../entities_grid/common';
import { buildEntityFilterClauses } from '../../../entities_grid/queries/entity_filters';
import { buildNewlyHighCriticalCountQuery } from '../tile_newly_high_critical_query';
import { buildRiskMoversCountQuery } from '../tile_risk_movers_query';
import { ENTITY_INDEX, NAMESPACE, startTilesCluster } from './fixture';
import type { TilesCluster } from './fixture';

const HIGH_IMPACT_ONLY = buildEntityFilterClauses({
  ...EMPTY_ENTITY_FILTERS,
  assetCriticality: ['high_impact'],
});

describe('risk tiles on Elasticsearch', () => {
  let cluster: TilesCluster;

  beforeAll(async () => {
    cluster = await startTilesCluster();
  }, 300_000);

  afterAll(async () => {
    await cluster?.stop();
  });

  describe('risk movers', () => {
    it('counts the entities whose score rose by 10 or more since the boundary', async () => {
      // host:alias rose too, and counts as its group's main entity, host:rise.
      expect(
        await cluster.runTileQuery(buildRiskMoversCountQuery(NAMESPACE, ENTITY_INDEX, '30d'))
      ).toEqual({ value: 2, entityIds: ['host:exact', 'host:rise'] });
    });

    it('keeps only the entities the filters keep', async () => {
      // host:alias has no criticality, so only host:rise's own rise counts.
      expect(
        await cluster.runTileQuery(
          buildRiskMoversCountQuery(NAMESPACE, ENTITY_INDEX, '30d', HIGH_IMPACT_ONLY)
        )
      ).toEqual({ value: 1, entityIds: ['host:rise'] });
    });
  });

  describe('newly high or critical', () => {
    it('counts the entities that became High or Critical since the boundary', async () => {
      // user:alias is newly High too, and counts as its group's main entity, user:up.
      expect(
        await cluster.runTileQuery(buildNewlyHighCriticalCountQuery(NAMESPACE, ENTITY_INDEX, '30d'))
      ).toEqual({
        value: 4,
        entityIds: ['user:high-to-crit', 'user:last-low', 'user:new-high', 'user:up'],
      });
    });

    it('keeps only the entities the filters keep', async () => {
      expect(
        await cluster.runTileQuery(
          buildNewlyHighCriticalCountQuery(NAMESPACE, ENTITY_INDEX, '30d', HIGH_IMPACT_ONLY)
        )
      ).toEqual({ value: 1, entityIds: ['user:up'] });
    });
  });
});
