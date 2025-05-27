/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { createMockEndpointAppContextService } from '../../../endpoint/mocks';
import { HostIsolationExceptionsValidator } from './host_isolation_exceptions_validator';

describe('Endpoint Exceptions API validations', () => {
  it('should initialize', () => {
    expect(
      new HostIsolationExceptionsValidator(
        createMockEndpointAppContextService(),
        httpServerMock.createKibanaRequest()
      )
    ).not.toBeUndefined();
  });
  // -----------------------------------------------------------------------------
  //
  //  API TESTS FOR THIS ARTIFACT TYPE SHOULD BE COVERED WITH INTEGRATION TESTS.
  //  ADD THEM HERE:
  //
  //  `x-pack/test/security_solution_api_integration/test_suites/edr_workflows`
  //
  // -----------------------------------------------------------------------------
});
