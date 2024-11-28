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

  describe('Favorites dashboard api', function () {
    before(async () => {
      await kibanaServer.savedObjects.clean({
        types: ['favorites'],
      });
    });

    it('can favorite a dashboard', async () => {
      const supertest = await roleScopedSupertest.getSupertestWithRoleScope('viewer', {
        useCookieHeader: true, // favorite only works with Cookie header
        withInternalHeaders: true,
      });

      let response = await supertest
        .get('/internal/content_management/favorites/dashboard')
        .expect(200);
      expect(response.body.favoriteIds).to.eql([]);

      const favoriteId = '1';

      response = await supertest
        .post(`/internal/content_management/favorites/dashboard/${favoriteId}/favorite`)
        .expect(200);

      expect(response.body.favoriteIds).to.eql([favoriteId]);

      response = await supertest
        .post(`/internal/content_management/favorites/dashboard/${favoriteId}/unfavorite`)
        .expect(200);
      expect(response.body.favoriteIds).to.eql([]);
    });
  });
}
