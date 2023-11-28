/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  cleanRiskEngine,
  cleanAssetCriticality,
  assetCriticalityRouteHelpersFactory,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const supertest = getService('supertest');
  const assetCriticalityRoutes = assetCriticalityRouteHelpersFactory(supertest);

  describe('@ess @serverless @skipInQA asset_criticality Asset Criticality APIs', () => {
    beforeEach(async () => {
      await cleanRiskEngine({ kibanaServer, es, log });
      await cleanAssetCriticality({ log, es });
    });

    afterEach(async () => {
      await cleanRiskEngine({ kibanaServer, es, log });
      await cleanAssetCriticality({ log, es });
    });

    describe('initialisation of resources', () => {
      it('should has index installed on status api call', async () => {
        const assetCriticalityIndex = '.asset-criticality.asset-criticality-default';

        let assetCriticalityIndexExist;

        try {
          assetCriticalityIndexExist = await es.indices.exists({
            index: assetCriticalityIndex,
          });
        } catch (e) {
          assetCriticalityIndexExist = false;
        }

        expect(assetCriticalityIndexExist).to.eql(false);

        const statusResponse = await assetCriticalityRoutes.status();

        expect(statusResponse.body).to.eql({
          asset_criticality_resources_installed: true,
        });

        const assetCriticalityIndexResult = await es.indices.get({
          index: assetCriticalityIndex,
        });

        expect(
          assetCriticalityIndexResult['.asset-criticality.asset-criticality-default']?.mappings
        ).to.eql({
          dynamic: 'strict',
          properties: {
            '@timestamp': {
              type: 'date',
            },
            criticality_level: {
              type: 'keyword',
            },
            id_field: {
              type: 'keyword',
            },
            id_value: {
              type: 'keyword',
            },
            updated_at: {
              type: 'date',
            },
          },
        });
      });
    });
  });
};
