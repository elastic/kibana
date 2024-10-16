/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { EntityStoreUtils } from '../../utils';
import { dataViewRouteHelpersFactory } from '../../utils/data_view';
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');
  const utils = EntityStoreUtils(getService);

  const ingestLogDocument = async (
    doc: Record<string, any>,
    index: string = 'logs-test-default'
  ) => {
    await es.index({
      index,
      body: doc,
      refresh: 'true',
    });
  };

  const createRiskScoreDocForEntity = async (name: string, entitytype: string) => {
    await es.index({
      index: 'risk-score.risk_score-default',
      body: {
        '@timestamp': new Date().toISOString(),
        [entitytype]: {
          name,
          risk: {
            calculated_score: 100,
          },
        },
      },
      refresh: 'true',
    });
  };

  const createAssetCriticalityDocForEntity = async (name: string, entitytype: string) => {
    await es.index({
      index: '.asset-criticality.asset_criticality-default',
      body: {
        '@timestamp': new Date().toISOString(),
        [entitytype]: {
          name,
        },
        asset: {
          criticality: 'medium_impact',
        },
      },
      refresh: 'true',
    });
  };

  describe('@ess @skipInServerlessMKI Entity Store Entities Tests', () => {
    const dataView = dataViewRouteHelpersFactory(supertest);

    before(async () => {
      await utils.cleanEngines();
      await dataView.create('security-solution');
      await utils.initEntityEngineForEntityType('host');
    });

    after(async () => {
      await utils.cleanEngines();
      await dataView.delete('security-solution');
    });

    describe('entity.source', () => {
      it('should set source as asset criticality if it is the first to be set', async () => {
        await createAssetCriticalityDocForEntity('test-1', 'host');
        await createRiskScoreDocForEntity('test-1', 'host');
        await ingestLogDocument({
          '@timestamp': new Date().toISOString(),
          host: {
            name: 'test-1',
          },
        });

        const entity = await utils.waitForEntity({
          name: 'test-1',
          entityType: 'host',
          expectedFields: ['event.source', 'asset.criticality', 'host.risk.calculated_score'],
        });

        expect(entity).to.have.property(
          'event.source',
          '.asset-criticality.asset_criticality-default'
        );
      });
    });
  });
};
