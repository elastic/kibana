/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import type { HttpSetup } from '@kbn/core-http-browser';
import { EventFiltersApiClient } from './api_client';
import { coreMock } from '@kbn/core/public/mocks';
import { SUGGESTIONS_INTERNAL_ROUTE } from '../../../../../common/endpoint/constants';
import { resolvePathVariables } from '../../../../common/utils/resolve_path_variables';

describe('EventFiltersApiClient', () => {
  let fakeHttpServices: Mocked<HttpSetup>;
  let eventFiltersApiClient: EventFiltersApiClient;

  beforeAll(() => {
    fakeHttpServices = coreMock.createStart().http as Mocked<HttpSetup>;
    eventFiltersApiClient = new EventFiltersApiClient(fakeHttpServices);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call the SUGGESTIONS_INTERNAL_ROUTE with correct URL and body', async () => {
    await eventFiltersApiClient.getSuggestions({
      field: 'host.name',
      query: 'test',
    });

    expect(fakeHttpServices.post).toHaveBeenCalledWith(
      resolvePathVariables(SUGGESTIONS_INTERNAL_ROUTE, { suggestion_type: 'eventFilters' }),
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
