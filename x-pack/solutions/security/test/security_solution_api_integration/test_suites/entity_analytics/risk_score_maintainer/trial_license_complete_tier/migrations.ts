/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getLookupIndexName } from '@kbn/security-solution-plugin/server/lib/entity_analytics/risk_score/maintainer/lookup/lookup_index';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import {
  EntityStoreUtils,
  cleanUpRiskScoreMaintainer,
  entityMaintainerRouteHelpersFactory,
  entityAnalyticsRouteHelpersFactory,
  getRiskScoreWriteIndexMappingAndSettings,
} from '../../utils';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const entityStoreUtils = EntityStoreUtils(getService);
  const maintainerRoutes = entityMaintainerRouteHelpersFactory(supertest);
  const entityAnalyticsRoutes = entityAnalyticsRouteHelpersFactory(supertest, log);
  const lookupIndex = getLookupIndexName('default');

  const installMaintainer = async () => {
    await entityStoreUtils.installEntityStoreV2({
      entityTypes: ['host'],
      waitForEntities: false,
      maintainerAutoStart: false,
    });
  };

  describe('@ess @serverless @serverlessQA migrations', () => {
    beforeEach(async () => {
      await entityStoreUtils.cleanEngines();
      await cleanUpRiskScoreMaintainer({ es, log });
      await es.indices.delete({ index: lookupIndex }, { ignore: [404] });
    });

    afterEach(async () => {
      await entityStoreUtils.cleanEngines();
      await cleanUpRiskScoreMaintainer({ es, log });
      await es.indices.delete({ index: lookupIndex }, { ignore: [404] });
    });

    it('runs migrations successfully when latest index is missing and only the risk score write index exists', async () => {
      await installMaintainer();
      await maintainerRoutes.runMaintainerSync('risk-score');

      await es.indices.delete(
        {
          index: 'risk-score.risk-score-latest-default',
        },
        { ignore: [404] }
      );

      await entityAnalyticsRoutes.runMigrations();

      const { mappings } = await getRiskScoreWriteIndexMappingAndSettings(es, 'default');
      expect(String(mappings?.dynamic)).to.be('false');
    });

    it('upgrades lookup index mapping to include calculation_run_id during startup', async () => {
      await es.indices.create({
        index: lookupIndex,
        settings: {
          'index.mode': 'lookup',
        },
        mappings: {
          properties: {
            entity_id: { type: 'keyword' },
            resolution_target_id: { type: 'keyword' },
            propagation_target_id: { type: 'keyword' },
            relationship_type: { type: 'keyword' },
            '@timestamp': { type: 'date' },
          },
        },
      });

      await installMaintainer();
      await maintainerRoutes.runMaintainerSync('risk-score');

      const mapping = await es.indices.getMapping({ index: lookupIndex });
      const properties = mapping[lookupIndex]?.mappings?.properties as
        | Record<string, { type?: string }>
        | undefined;

      expect(properties?.calculation_run_id?.type).to.be('keyword');
    });
  });
};
