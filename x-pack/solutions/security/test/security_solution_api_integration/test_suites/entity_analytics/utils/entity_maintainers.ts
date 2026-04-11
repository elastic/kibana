/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { ENTITY_STORE_ROUTES } from '@kbn/entity-store/common';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { routeWithNamespace } from '@kbn/detections-response-ftr-services';

const ENTITY_STORE_INTERNAL_API_VERSION = '2';

const withHeaders = (req: SuperTest.Test) =>
  req
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', ENTITY_STORE_INTERNAL_API_VERSION)
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'Kibana');

export interface EntityMaintainerResponse {
  id: string;
  taskStatus: string;
  interval: string;
  description: string | null;
  customState: Record<string, unknown> | null;
  runs: number;
  lastSuccessTimestamp: string | null;
  lastErrorTimestamp: string | null;
}

export const entityMaintainerRouteHelpersFactory = (
  supertest: SuperTest.Agent,
  namespace?: string
) => {
  const getMaintainers = async (expectStatusCode: number = 200) => {
    const response = await withHeaders(
      supertest.get(routeWithNamespace(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_GET, namespace))
    ).expect(expectStatusCode);
    return response as SuperTest.Response & {
      body: { maintainers: EntityMaintainerResponse[] };
    };
  };

  return {
    getMaintainers,

    initMaintainers: async (expectStatusCode: number = 200) => {
      const response = await withHeaders(
        supertest.post(routeWithNamespace(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_INIT, namespace))
      )
        .send()
        .expect((res) => {
          if (res.status !== expectStatusCode) {
            throw new Error(
              `initMaintainers failed with status ${res.status}. Body: ${JSON.stringify(res.body)}`
            );
          }
        });
      return response;
    },

    runMaintainer: async (id: string, expectStatusCode: number = 200) => {
      const route = ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_RUN.replace('{id}', id);
      const response = await withHeaders(supertest.post(routeWithNamespace(route, namespace)))
        .send()
        .expect(expectStatusCode);
      return response;
    },

    startMaintainer: async (id: string, expectStatusCode: number = 200) => {
      const route = ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_START.replace('{id}', id);
      const response = await withHeaders(supertest.put(routeWithNamespace(route, namespace)))
        .send()
        .expect(expectStatusCode);
      return response;
    },

    stopMaintainer: async (id: string, expectStatusCode: number = 200) => {
      const route = ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_STOP.replace('{id}', id);
      const response = await withHeaders(supertest.put(routeWithNamespace(route, namespace)))
        .send()
        .expect(expectStatusCode);
      return response;
    },

    getRiskScoreMaintainer: async (): Promise<EntityMaintainerResponse | null> => {
      const response = await getMaintainers();
      const maintainers: EntityMaintainerResponse[] = response.body.maintainers ?? [];
      return maintainers.find((m) => m.id === 'risk-score') ?? null;
    },
  };
};
