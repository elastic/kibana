/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY_ENTITY_FILTERS } from '../../entities_grid/common';
import type { TimeRange } from '../../entities_grid/common';
import { buildEntityFilterClauses } from '../../entities_grid/queries/entity_filters';
import { buildAlertBasedTilesQuery } from './entities_with_alerts_query';
import { buildEntitiesWithAnomaliesCountQuery } from './entities_with_anomalies_query';
import { buildNewlyHighCriticalCountQuery } from './tile_newly_high_critical_query';
import { buildRiskMoversCountQuery } from './tile_risk_movers_query';

const ENTITIES_INDEX = '.entities.v2.latest.default-00001';
const CRITICALITY_FILTER_CLAUSES = buildEntityFilterClauses({
  ...EMPTY_ENTITY_FILTERS,
  assetCriticality: ['high_impact', 'extreme_impact'],
});

describe('needs attention tile queries', () => {
  describe.each([
    ['over 24h without entity filters', '24h', []],
    ['over 30d with a criticality filter', '30d', CRITICALITY_FILTER_CLAUSES],
  ] as ReadonlyArray<[string, TimeRange, string[]]>)('%s', (_name, timeRange, filters) => {
    it('builds the alert based tiles query', () => {
      expect(
        buildAlertBasedTilesQuery(ENTITIES_INDEX, 'default', timeRange, filters)
      ).toMatchSnapshot();
    });

    it('builds the entities with anomalies query', () => {
      expect(
        buildEntitiesWithAnomaliesCountQuery(ENTITIES_INDEX, timeRange, filters, [
          'security_auth_rare_user',
        ])
      ).toMatchSnapshot();
    });

    it('builds the risk movers query', () => {
      expect(
        buildRiskMoversCountQuery('default', ENTITIES_INDEX, timeRange, filters)
      ).toMatchSnapshot();
    });

    it('builds the newly high or critical query', () => {
      expect(
        buildNewlyHighCriticalCountQuery('default', ENTITIES_INDEX, timeRange, filters)
      ).toMatchSnapshot();
    });
  });
});
