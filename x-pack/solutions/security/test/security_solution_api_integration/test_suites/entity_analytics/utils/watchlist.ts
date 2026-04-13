/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { API_VERSIONS } from '@kbn/security-solution-plugin/common/constants';
import { WATCHLISTS_URL } from '@kbn/security-solution-plugin/common/entity_analytics/watchlists/constants';
import type { CreateWatchlistRequestBody } from '@kbn/security-solution-plugin/common/api/entity_analytics/watchlists/management/create.gen';
import type { WatchlistObject } from '@kbn/security-solution-plugin/common/api/entity_analytics/watchlists/management/common.gen';
import { routeWithNamespace } from '@kbn/detections-response-ftr-services';

export type WatchlistRouteHelpers = ReturnType<typeof watchlistRouteHelpersFactory>;

export const cleanUpWatchlists = async (watchlistRoutes: WatchlistRouteHelpers): Promise<void> => {
  const listResponse = await watchlistRoutes.list().catch(() => undefined);
  if (!listResponse) {
    return;
  }
  for (const watchlist of listResponse.body) {
    if (watchlist.id) {
      await watchlistRoutes.delete(watchlist.id).catch(() => undefined);
    }
  }
};

export const watchlistRouteHelpersFactory = (supertest: SuperTest.Agent, namespace?: string) => ({
  create: async (
    body: CreateWatchlistRequestBody,
    { expectStatusCode }: { expectStatusCode: number } = { expectStatusCode: 200 }
  ): Promise<SuperTest.Response & { body: WatchlistObject }> => {
    const response = await supertest
      .post(routeWithNamespace(WATCHLISTS_URL, namespace))
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send(body)
      .expect(expectStatusCode);

    return response;
  },
  list: async (
    { expectStatusCode }: { expectStatusCode: number } = { expectStatusCode: 200 }
  ): Promise<SuperTest.Response & { body: WatchlistObject[] }> => {
    return supertest
      .get(routeWithNamespace(`${WATCHLISTS_URL}/list`, namespace))
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .expect(expectStatusCode);
  },
  get: async (
    id: string,
    { expectStatusCode }: { expectStatusCode: number } = { expectStatusCode: 200 }
  ): Promise<SuperTest.Response & { body: WatchlistObject }> => {
    return supertest
      .get(routeWithNamespace(`${WATCHLISTS_URL}/${id}`, namespace))
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .expect(expectStatusCode);
  },
  delete: async (
    id: string,
    { expectStatusCode }: { expectStatusCode: number } = { expectStatusCode: 200 }
  ): Promise<SuperTest.Response> => {
    return supertest
      .delete(routeWithNamespace(`${WATCHLISTS_URL}/${id}`, namespace))
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .expect(expectStatusCode);
  },
});
