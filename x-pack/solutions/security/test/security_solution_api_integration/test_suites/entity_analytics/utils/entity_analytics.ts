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
import {
  ENTITY_ANALYTICS_INTERNAL_RUN_MIGRATIONS_ROUTE,
  API_VERSIONS,
} from '@kbn/security-solution-plugin/common/constants';
import type { ToolingLog } from '@kbn/tooling-log';
import { routeWithNamespace } from '@kbn/detections-response-ftr-services';

export const entityAnalyticsRouteHelpersFactory = (
  supertest: SuperTest.Agent,
  log: ToolingLog,
  namespace?: string
) => ({
  runMigrations: async () =>
    await supertest
      .post(routeWithNamespace(ENTITY_ANALYTICS_INTERNAL_RUN_MIGRATIONS_ROUTE, namespace))
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send()
      // log the response to help with debugging without changing the test behavior
      .expect((response) => {
        if (response.status !== 200) {
          log.error(
            `Failed to run migrations: body: ${JSON.stringify(
              response.body
            )}, status: ${JSON.stringify(response.status)}`
          );
        }

        return response;
      })
      .expect(200),
});
