/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import SuperTest from 'supertest';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import {
  ASSET_CRITICALITY_STATUS_URL,
  ASSET_CRITICALITY_URL,
  ASSET_CRITICALITY_PRIVILEGES_URL,
} from '@kbn/security-solution-plugin/common/constants';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import querystring from 'querystring';
import { routeWithNamespace } from '../../detections_response/utils';

export const getAssetCriticalityIndex = (namespace?: string) =>
  `.asset-criticality.asset-criticality-${namespace ?? 'default'}`;

export const cleanAssetCriticality = async ({
  log,
  es,
  namespace = 'default',
}: {
  log: ToolingLog;
  es: Client;
  namespace?: string;
}) => {
  try {
    await Promise.allSettled([
      es.indices.delete({
        index: [getAssetCriticalityIndex(namespace)],
      }),
    ]);
  } catch (e) {
    log.warning(`Error deleting asset criticality index: ${e.message}`);
  }
};

export const getAssetCriticalityDoc = async (opts: {
  es: Client;
  idField: string;
  idValue: string;
}) => {
  const { es, idField, idValue } = opts;
  try {
    const doc = await es.get({
      index: getAssetCriticalityIndex(),
      id: `${idField}:${idValue}`,
    });

    return doc._source;
  } catch (e) {
    return undefined;
  }
};

export const assetCriticalityRouteHelpersFactory = (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  namespace?: string
) => ({
  status: async () =>
    await supertest
      .get(routeWithNamespace(ASSET_CRITICALITY_STATUS_URL, namespace))
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send()
      .expect(200),
  upsert: async (
    body: Record<string, unknown>,
    { expectStatusCode }: { expectStatusCode: number } = { expectStatusCode: 200 }
  ) =>
    await supertest
      .post(routeWithNamespace(ASSET_CRITICALITY_URL, namespace))
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send(body)
      .expect(expectStatusCode),
  delete: async (idField: string, idValue: string) => {
    const qs = querystring.stringify({ id_field: idField, id_value: idValue });
    const route = `${routeWithNamespace(ASSET_CRITICALITY_URL, namespace)}?${qs}`;
    return supertest
      .delete(route)
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .expect(200);
  },
  get: async (
    idField: string,
    idValue: string,
    { expectStatusCode }: { expectStatusCode: number } = { expectStatusCode: 200 }
  ) => {
    const qs = querystring.stringify({ id_field: idField, id_value: idValue });
    const route = `${routeWithNamespace(ASSET_CRITICALITY_URL, namespace)}?${qs}`;
    return supertest
      .get(route)
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .expect(expectStatusCode);
  },
});

export const assetCriticalityRouteHelpersFactoryNoAuth = (
  supertestWithoutAuth: SuperTest.SuperTest<SuperTest.Test>,
  namespace?: string
) => ({
  privilegesForUser: async ({ username, password }: { username: string; password: string }) =>
    await supertestWithoutAuth
      .get(ASSET_CRITICALITY_PRIVILEGES_URL)
      .auth(username, password)
      .set('elastic-api-version', '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send()
      .expect(200),
});
