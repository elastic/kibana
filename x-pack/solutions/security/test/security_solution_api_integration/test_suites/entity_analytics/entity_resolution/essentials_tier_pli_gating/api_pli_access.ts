/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_STORE_ROUTES, API_VERSIONS } from '@kbn/entity-store/common';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');

  // On serverless Essentials, `advancedInsights` is off so `api:securitySolution-entity-analytics`
  // is not registered; product feature API access control responds with 404 (not 403).
  describe('@serverless essentials tier PLI access — entity resolution routes', () => {
    it('should not find resolution link api', async () => {
      await supertest
        .post(ENTITY_STORE_ROUTES.public.RESOLUTION_LINK)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', API_VERSIONS.public.v1)
        .send({ target_id: 'user:probe@okta', entity_ids: ['user:probe@entra_id'] })
        .expect(404);
    });
  });
};
