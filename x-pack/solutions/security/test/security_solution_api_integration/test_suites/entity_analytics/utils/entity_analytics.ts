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
  ENTITY_ANALYTICS_INTERNAL_RUN_MIGRATIONS_ROUTE,
  API_VERSIONS,
} from '@kbn/security-solution-plugin/common/constants';
import { routeWithNamespace } from '../../../../common/utils/security_solution';

export const entityAnalyticsRouteHelpersFactory = (
  supertest: SuperTest.Agent,
  namespace?: string
) => ({
  runMigrations: async () =>
    await supertest
      .post(routeWithNamespace(ENTITY_ANALYTICS_INTERNAL_RUN_MIGRATIONS_ROUTE, namespace))
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send()
      .expect(200),
});
