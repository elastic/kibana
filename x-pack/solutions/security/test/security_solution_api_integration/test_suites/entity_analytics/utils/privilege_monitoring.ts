/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type SuperTest from 'supertest';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { SupertestWithoutAuthProviderType } from '@kbn/ftr-common-functional-services';
import {
  API_VERSIONS,
  PRIVILEGE_MONITORING_PRIVILEGE_CHECK_API,
} from '@kbn/security-solution-plugin/common/constants';
import { routeWithNamespace } from '@kbn/detections-response-ftr-services';
import {
  PAD_INSTALL_URL,
  PAD_STATUS_URL,
} from '@kbn/security-solution-plugin/common/entity_analytics/privileged_user_monitoring/constants';

const assertStatusCode = (statusCode: number, response: SuperTest.Response) => {
  if (response.status !== statusCode) {
    throw new Error(
      `Expected status code ${statusCode}, but got ${response.statusCode} \n` + response.text
    );
  }
};

export const privilegeMonitoringRouteHelpersFactory = (
  supertest: SuperTest.Agent,
  namespace?: string
) => {
  return {
    init: async (expectStatusCode: number = 200) => {
      const response = await supertest
        .post(routeWithNamespace('/api/entity_analytics/monitoring/engine/init', namespace))
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', API_VERSIONS.public.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();
      assertStatusCode(expectStatusCode, response);
      return response;
    },
    disable: async (expectStatusCode: number = 200) => {
      const response = await supertest
        .post(routeWithNamespace('/api/entity_analytics/monitoring/engine/disable', namespace))
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', API_VERSIONS.public.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();
      assertStatusCode(expectStatusCode, response);
      return response;
    },
    delete: async (expectStatusCode: number = 200) => {
      const response = await supertest
        .delete(routeWithNamespace('/api/entity_analytics/monitoring/engine/delete', namespace))
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', API_VERSIONS.public.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();
      assertStatusCode(expectStatusCode, response);
      return response;
    },
    healthCheck: async (expectStatusCode: number = 200) => {
      const response = await supertest
        .get(routeWithNamespace('/api/entity_analytics/monitoring/privileges/health', namespace))
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', API_VERSIONS.public.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();
      assertStatusCode(expectStatusCode, response);
      return response;
    },
    privilegeCheck: async (expectStatusCode: number = 200) => {
      const response = await supertest
        .get(routeWithNamespace(PRIVILEGE_MONITORING_PRIVILEGE_CHECK_API, namespace))
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', API_VERSIONS.public.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();
      assertStatusCode(expectStatusCode, response);
      return response;
    },
    createIndices: async (requestBody: Record<string, unknown>, expectStatusCode: number = 200) => {
      const response = await supertest
        .put(routeWithNamespace('/api/entity_analytics/monitoring/privileges/indices', namespace))
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', API_VERSIONS.public.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send(requestBody);
      assertStatusCode(expectStatusCode, response);
      return response;
    },
    searchIndices: async (expectStatusCode: number = 200) => {
      const response = await supertest
        .get(routeWithNamespace('/api/entity_analytics/monitoring/privileges/indices', namespace))
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', API_VERSIONS.public.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();
      assertStatusCode(expectStatusCode, response);
      return response;
    },
    createUser: async (requestBody: Record<string, unknown>, expectStatusCode: number = 200) => {
      const response = await supertest
        .post(routeWithNamespace('/api/entity_analytics/monitoring/users', namespace))
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', API_VERSIONS.public.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send(requestBody);
      assertStatusCode(expectStatusCode, response);
      return response;
    },
    listUsers: async (expectStatusCode: number = 200) => {
      const response = await supertest
        .get(routeWithNamespace('/api/entity_analytics/monitoring/users/list', namespace))
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', API_VERSIONS.public.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();
      assertStatusCode(expectStatusCode, response);
      return response;
    },
    updateUser: async (
      id: string,
      requestBody: Record<string, unknown>,
      expectStatusCode: number = 200
    ) => {
      const response = await supertest
        .put(routeWithNamespace(`/api/entity_analytics/monitoring/users/${id}`, namespace))
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', API_VERSIONS.public.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send(requestBody);
      assertStatusCode(expectStatusCode, response);
      return response;
    },
    uploadUsersCSV: async (fileContent: string | Buffer, expectStatusCode: number = 200) => {
      const file = fileContent instanceof Buffer ? fileContent : Buffer.from(fileContent);
      const response = await supertest
        .post(routeWithNamespace('/api/entity_analytics/monitoring/users/_csv', namespace))
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', API_VERSIONS.public.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .attach('file', file, { filename: 'users.csv', contentType: 'text/csv' });
      assertStatusCode(expectStatusCode, response);
      return response;
    },
    deleteUser: async (id: string, expectStatusCode: number = 200) => {
      const response = await supertest
        .delete(routeWithNamespace(`/api/entity_analytics/monitoring/users/${id}`, namespace))
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', API_VERSIONS.public.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();
      assertStatusCode(expectStatusCode, response);
      return response;
    },
    padInstall: async (expectStatusCode: number = 200) => {
      const response = await supertest
        .post(routeWithNamespace(PAD_INSTALL_URL, namespace))
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', API_VERSIONS.public.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();
      assertStatusCode(expectStatusCode, response);
      return response;
    },
    padStatus: async (expectStatusCode: number = 200) => {
      const response = await supertest
        .get(routeWithNamespace(PAD_STATUS_URL, namespace))
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', API_VERSIONS.public.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();
      assertStatusCode(expectStatusCode, response);
      return response;
    },
    listSource: async (expectStatusCode: number = 200) => {
      const response = await supertest
        .get(routeWithNamespace('/api/entity_analytics/monitoring/entity_source/list', namespace))
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', API_VERSIONS.public.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();
      assertStatusCode(expectStatusCode, response);
      return response;
    },
  };
};

export const privilegeMonitoringRouteHelpersFactoryNoAuth = (
  supertestWithoutAuth: SupertestWithoutAuthProviderType
) => ({
  privilegesForUser: async ({ username, password }: { username: string; password: string }) =>
    await supertestWithoutAuth
      .get('/api/entity_analytics/monitoring/privileges/privileges')
      .auth(username, password)
      .set('elastic-api-version', API_VERSIONS.public.v1)
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send()
      .expect(200),
});
