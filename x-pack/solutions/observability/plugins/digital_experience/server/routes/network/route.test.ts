/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applicationRouteTestCases } from '../application_route.test_helpers';
import { getOtelNetwork } from './otel/get_otel_network';
import { APPLICATION_NETWORK_ENDPOINT, networkRouteRepository } from './route';

jest.mock('./otel/get_otel_network');

describe('GET /internal/digital_experience/applications/{serviceName}/network', () => {
  applicationRouteTestCases({
    route: () => {
      return networkRouteRepository[APPLICATION_NETWORK_ENDPOINT];
    },
    getData: jest.mocked(getOtelNetwork),
  });
});
