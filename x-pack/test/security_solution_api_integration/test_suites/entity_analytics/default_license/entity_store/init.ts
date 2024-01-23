/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { cleanEntityStore, entityStoreRouteHelpersFactory } from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const entityStoreRoutes = entityStoreRouteHelpersFactory(supertest);
  const log = getService('log');

  describe('@ess @serverless Entity Store API', () => {
    afterEach(async () => {
      await cleanEntityStore({ es, log });
    });

    describe('init api', () => {
      it('should return response with success status', async () => {
        const response = await entityStoreRoutes.init();
        expect(response.body).to.eql({
          result: {
            errors: [],
            entity_store_created: true,
          },
        });
      });

      it('should install resources on init call', async () => {
        const latestIndexName = '.entities.entities-default';

        await entityStoreRoutes.init();

        const indexExist = await es.indices.exists({
          index: latestIndexName,
        });
        expect(indexExist).to.eql(true);
      });
    });
  });
};
