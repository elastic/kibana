/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { SupertestWithoutAuthProviderType } from '@kbn/ftr-common-functional-services';
import { API_VERSIONS } from '@kbn/security-solution-plugin/common/constants';

export const privilegeMonitoringRouteHelpersFactory = (
  supertest: SupertestWithoutAuthProviderType
) => {
  const setHeaders = (req: any) =>
    req
      .set('elastic-api-version', API_VERSIONS.public.v1)
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .set('kbn-xsrf', 'true');

  return {
    privilegesForUser: async ({ username, password }: { username: string; password: string }) => {
      return await setHeaders(
        supertest
          .get('/api/entity_analytics/monitoring/privileges/privileges')
          .auth(username, password)
      )
        .send()
        .expect(200);
    },

    registerIndexSource: async (source: any) => {
      const response = await setHeaders(
        supertest.post('/api/entity_analytics/monitoring/entity_source')
      ).send(source);

      if (response.status !== 200) {
        console.error('❌ registerIndexSource failed with status:', response.status);
        console.error('👉 Response body:', JSON.stringify(response.body, null, 2));
        console.error('📦 Sent payload:', JSON.stringify(source, null, 2));
      }

      // expect(response.status).to.be.equal(200);
      return response;
    },

    initEngine: async () => {
      return await setHeaders(supertest.post('/api/entity_analytics/monitoring/engine/init'))
        .send()
        .expect(200);
    },

    listUsers: async () => {
      return await setHeaders(supertest.get('/api/entity_analytics/monitoring/users/list')).expect(
        200
      );
    },

    deleteIndexSource: async (sourceId: string, { ignore404 = false } = {}) => {
      const res = await setHeaders(
        supertest.delete(`/api/entity_analytics/monitoring/entity_source/${sourceId}`)
      ).catch((err: { status: number }) => {
        if (ignore404 && err.status === 404) return { status: 404 };
        throw err;
      });

      if (!ignore404 && res.status !== 200) {
        throw new Error(`Expected 200 OK, got ${res.status}`);
      }

      return res;
    },
  };
};
