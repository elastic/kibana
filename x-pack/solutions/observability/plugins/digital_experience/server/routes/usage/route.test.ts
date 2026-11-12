/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applicationRouteTestCases } from '../application_route.test_helpers';
import { APPLICATION_USAGE_ENDPOINT, usageRouteRepository } from './route';
import { getOtelUsage } from './otel/get_otel_usage';

jest.mock('./otel/get_otel_usage');

describe('GET /internal/digital_experience/applications/{serviceName}/usage', () => {
  applicationRouteTestCases({
    route: () => {
      return usageRouteRepository[APPLICATION_USAGE_ENDPOINT];
    },
    getData: jest.mocked(getOtelUsage),
    hasFilters: true,
  });
});
