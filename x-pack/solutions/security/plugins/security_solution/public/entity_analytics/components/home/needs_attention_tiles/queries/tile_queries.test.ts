/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';
import type { TimeRange } from '../../new_entities_table/common';
import { buildAlertBasedTilesQuery } from './entities_with_alerts_query';
import { buildEntitiesWithAnomaliesCountQuery } from './entities_with_anomalies_query';
import { buildNewlyHighCriticalCountQuery } from './tile_newly_high_critical_query';
import { buildRiskMoversCountQuery } from './tile_risk_movers_query';
import { withFastEuidEsql } from './with_fast_euid_esql';

const ENTITIES_INDEX = '.entities.v2.latest.default-00001';
const ENTITY_FILTER_CLAUSES = ['asset.criticality IN ("high_impact", "extreme_impact")'];

// The tiles derive entity ids with the same EUID ES|QL the page uses.
const euid = withFastEuidEsql({ esql: {} } as unknown as EntityStoreEuid);

describe('needs attention tile queries', () => {
  describe.each([
    ['24h', []],
    ['30d', ENTITY_FILTER_CLAUSES],
  ] as ReadonlyArray<[TimeRange, string[]]>)('over %s with filters %j', (timeRange, filters) => {
    it('builds the alert based tiles query', () => {
      expect(
        buildAlertBasedTilesQuery(euid, ENTITIES_INDEX, 'default', timeRange, filters)
      ).toMatchSnapshot();
    });

    it('builds the entities with anomalies query', () => {
      expect(
        buildEntitiesWithAnomaliesCountQuery(euid, ENTITIES_INDEX, timeRange, filters, [
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
