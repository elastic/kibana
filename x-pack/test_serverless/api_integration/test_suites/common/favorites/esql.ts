/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const kibanaServer = getService('kibanaServer');

  describe('Favorites esql query api', function () {
    before(async () => {
      await kibanaServer.savedObjects.clean({
        types: ['favorites'],
      });
    });

    it('can favorite an esql_query', async () => {
      const supertest = await roleScopedSupertest.getSupertestWithRoleScope('viewer', {
        useCookieHeader: true, // favorite only works with Cookie header
        withInternalHeaders: true,
      });

      const list = () =>
        supertest.get('/internal/content_management/favorites/esql_query').expect(200);

      let response = await list();
      expect(response.body.favoriteIds).to.eql([]);

      const favoriteId = '1';
      const metadata = {
        queryString: 'SELECT * FROM test1',
        createdAt: '2021-09-01T00:00:00Z',
        status: 'success',
      };

      response = await supertest
        .post(`/internal/content_management/favorites/esql_query/${favoriteId}/favorite`)
        .send({ metadata })
        .expect(200);

      expect(response.body.favoriteIds).to.eql([favoriteId]);

      response = await list();
      expect(response.body.favoriteIds).to.eql([favoriteId]);
      expect(response.body.favoriteMetadata).to.eql({ [favoriteId]: metadata });

      response = await supertest
        .post(`/internal/content_management/favorites/esql_query/${favoriteId}/unfavorite`)
        .expect(200);
      expect(response.body.favoriteIds).to.eql([]);

      response = await list();
      expect(response.body.favoriteIds).to.eql([]);
      expect(response.body.favoriteMetadata).to.eql({});
    });
  });
}
