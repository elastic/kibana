/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { SupertestWithRoleScope } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services/role_scoped_supertest';
import { FtrProviderContext } from '../../../ftr_provider_context';

const API_BASE_PATH = '/internal/serverless_search';

export default function ({ getService }: FtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestViewerWithCookieCredentials: SupertestWithRoleScope;

  describe('Indices routes', function () {
    describe('GET indices', function () {
      before(async () => {
        supertestViewerWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
          'viewer',
          {
            useCookieHeader: true,
            withInternalHeaders: true,
          }
        );
      });

      it('has route', async () => {
        const { body } = await supertestViewerWithCookieCredentials
          .get(`${API_BASE_PATH}/indices`)
          .expect(200);

        expect(body).toBeDefined();
      });
      it('accepts search_query', async () => {
        await supertestViewerWithCookieCredentials
          .get(`${API_BASE_PATH}/indices`)
          .query({ search_query: 'foo' })
          .expect(200);
      });
      it('accepts from & size', async () => {
        await supertestViewerWithCookieCredentials
          .get(`${API_BASE_PATH}/indices`)
          .query({ from: 0, size: 10 })
          .expect(200);
      });
    });
  });
}
