/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import type { HttpSetup } from '@kbn/core-http-browser';
import { TrustedAppsApiClient } from './api_client';
import { coreMock } from '@kbn/core/public/mocks';
import { SUGGESTIONS_INTERNAL_ROUTE } from '../../../../../common/endpoint/constants';
import { resolvePathVariables } from '../../../../common/utils/resolve_path_variables';

describe('TrustedAppsApiClient', () => {
  let fakeHttpServices: Mocked<HttpSetup>;
  let trustedAppsApiClient: TrustedAppsApiClient;

  beforeAll(() => {
    fakeHttpServices = coreMock.createStart().http as Mocked<HttpSetup>;
    trustedAppsApiClient = new TrustedAppsApiClient(fakeHttpServices);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call the SUGGESTIONS_INTERNAL_ROUTE with correct URL and body', async () => {
    await trustedAppsApiClient.getSuggestions({
      field: 'host.name',
      query: 'test',
    });

    expect(fakeHttpServices.post).toHaveBeenCalledWith(
      resolvePathVariables(SUGGESTIONS_INTERNAL_ROUTE, { suggestion_type: 'trustedApps' }),
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
