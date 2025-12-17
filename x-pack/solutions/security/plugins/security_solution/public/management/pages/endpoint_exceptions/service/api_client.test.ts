/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { EndpointExceptionsApiClient } from './api_client';
import { coreMock } from '@kbn/core/public/mocks';
import { SUGGESTIONS_INTERNAL_ROUTE } from '../../../../../common/endpoint/constants';
import { resolvePathVariables } from '../../../../common/utils/resolve_path_variables';

describe('EndpointExceptionsApiClient', () => {
  let fakeHttpServices: jest.Mocked<HttpSetup>;
  let endpointExceptionsApiClient: EndpointExceptionsApiClient;

  beforeAll(() => {
    fakeHttpServices = coreMock.createStart().http as jest.Mocked<HttpSetup>;
    endpointExceptionsApiClient = new EndpointExceptionsApiClient(fakeHttpServices);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call the SUGGESTIONS_INTERNAL_ROUTE with correct URL and body', async () => {
    await endpointExceptionsApiClient.getSuggestions({
      field: 'host.name',
      query: 'test',
    });

    expect(fakeHttpServices.post).toHaveBeenCalledWith(
      resolvePathVariables(SUGGESTIONS_INTERNAL_ROUTE, { suggestion_type: 'endpointExceptions' }),
      {
        version: '1',
        body: JSON.stringify({
          field: 'host.name',
          query: 'test',
        }),
      }
    );
  });
});
