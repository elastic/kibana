/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { CreateExceptionListItemOptions } from '@kbn/lists-plugin/server';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { createMockEndpointAppContextService } from '../../../endpoint/mocks';
import { EndpointExceptionsValidator } from './endpoint_exceptions_validator';
import { GLOBAL_ARTIFACT_TAG } from '../../../../common/endpoint/service/artifacts/constants';

describe('Endpoint Exceptions API validations', () => {
  it('should initialize', () => {
    expect(
      new EndpointExceptionsValidator(
        createMockEndpointAppContextService(),
        httpServerMock.createKibanaRequest()
      )
    ).not.toBeUndefined();
  });

  describe('entry value characters', () => {
    let validator: EndpointExceptionsValidator;

    beforeEach(() => {
      const endpointAppContextService = createMockEndpointAppContextService();
      (
        endpointAppContextService.isEndpointExceptionsPerPolicyEnabled as jest.Mock
      ).mockResolvedValue(true);
      validator = new EndpointExceptionsValidator(
        endpointAppContextService,
        httpServerMock.createKibanaRequest()
      );
    });

    const buildItem = (value: string): CreateExceptionListItemOptions =>
      ({
        listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
        name: 'Test endpoint exception',
        description: '',
        namespaceType: 'agnostic',
        osTypes: ['windows'],
        tags: [GLOBAL_ARTIFACT_TAG],
        entries: [
          { field: 'process.executable.caseless', type: 'match', operator: 'included', value },
        ],
      } as unknown as CreateExceptionListItemOptions);

    it('rejects a null character on create', async () => {
      await expect(
        validator.validatePreCreateItem(buildItem('C:\\Windows\\note\u0000pad.exe'))
      ).rejects.toThrow(/null characters in fields: process\.executable\.caseless/);
    });
  });
  // -----------------------------------------------------------------------------
  //
  //  API TESTS FOR THIS ARTIFACT TYPE SHOULD BE COVERED WITH INTEGRATION TESTS.
  //  ADD THEM HERE:
  //
  //  `x-pack/solutions/security/test/security_solution_api_integration/test_suites/edr_workflows`
  //
  // -----------------------------------------------------------------------------
});
