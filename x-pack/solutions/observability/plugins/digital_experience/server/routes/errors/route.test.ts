/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applicationRouteTestCases } from '../application_route.test_helpers';
import { getOtelErrors } from './otel/get_otel_errors';
import { APPLICATION_ERRORS_ENDPOINT, errorsRouteRepository } from './route';

jest.mock('./otel/get_otel_errors');

describe('GET /internal/digital_experience/applications/{serviceName}/errors', () => {
  applicationRouteTestCases({
    route: () => {
      return errorsRouteRepository[APPLICATION_ERRORS_ENDPOINT];
    },
    getData: jest.mocked(getOtelErrors),
    hasFilters: true,
    takesPage: false,
  });
});
