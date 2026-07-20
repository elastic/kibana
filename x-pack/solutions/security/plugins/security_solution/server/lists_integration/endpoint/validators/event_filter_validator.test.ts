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
import { EventFilterValidator } from './event_filter_validator';
import { GLOBAL_ARTIFACT_TAG } from '../../../../common/endpoint/service/artifacts/constants';
import { EndpointArtifactExceptionValidationError } from './errors';

describe('Endpoint Exceptions API validations', () => {
  it('should initialize', () => {
    expect(
      new EventFilterValidator(
        createMockEndpointAppContextService(),
        httpServerMock.createKibanaRequest()
      )
    ).not.toBeUndefined();
  });

  describe('entry field length bounds', () => {
    let validator: EventFilterValidator;

    beforeEach(() => {
      validator = new EventFilterValidator(
        createMockEndpointAppContextService(),
        httpServerMock.createKibanaRequest()
      );
    });

    const buildItem = (field: string): CreateExceptionListItemOptions =>
      ({
        listId: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
        name: 'Test event filter',
        description: '',
        namespaceType: 'agnostic',
        osTypes: ['windows'],
        tags: [GLOBAL_ARTIFACT_TAG],
        entries: [{ field, type: 'match', operator: 'included', value: 'elastic' }],
      } as unknown as CreateExceptionListItemOptions);

    it('accepts a field at the 1024 character limit', async () => {
      await expect(
        validator.validatePreCreateItem(buildItem('a'.repeat(1024)))
      ).resolves.toBeDefined();
    });

    it('rejects a field over the 1024 character limit', async () => {
      await expect(validator.validatePreCreateItem(buildItem('a'.repeat(1025)))).rejects.toThrow(
        EndpointArtifactExceptionValidationError
      );
      await expect(validator.validatePreCreateItem(buildItem('a'.repeat(1025)))).rejects.toThrow(
        /maximum length of \[1024\]/
      );
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
