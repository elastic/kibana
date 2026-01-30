/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { coreMock } from '@kbn/core/public/mocks';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { TrustedDevicesApiClient } from './api_client';
import { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';
import { TRUSTED_DEVICES_EXCEPTION_LIST_DEFINITION } from '../constants';
import { readTransform, writeTransform } from './transforms';
import { SUGGESTIONS_INTERNAL_ROUTE } from '../../../../../common/endpoint/constants';
import { resolvePathVariables } from '../../../../common/utils/resolve_path_variables';

describe('TrustedDevicesApiClient', () => {
  let fakeHttpServices: jest.Mocked<HttpSetup>;

  beforeEach(() => {
    fakeHttpServices = coreMock.createStart().http as jest.Mocked<HttpSetup>;
    jest.clearAllMocks();
  });

  it('getInstance delegates to ExceptionsListApiClient.getInstance with correct args', () => {
    const expected = {} as unknown as ExceptionsListApiClient;
    const spy = jest
      .spyOn(ExceptionsListApiClient, 'getInstance')
      .mockReturnValue(expected as unknown as ExceptionsListApiClient);

    const result = TrustedDevicesApiClient.getInstance(fakeHttpServices);

    expect(spy).toHaveBeenCalledWith(
      fakeHttpServices,
      ENDPOINT_ARTIFACT_LISTS.trustedDevices.id,
      TRUSTED_DEVICES_EXCEPTION_LIST_DEFINITION,
      readTransform,
      writeTransform
    );
    expect(result).toBe(expected);
  });

  it('constructor creates an instance', () => {
    const instance = new TrustedDevicesApiClient(fakeHttpServices);
    expect(instance).toBeInstanceOf(ExceptionsListApiClient);
  });

  describe('getSuggestions', () => {
    let trustedDevicesApiClient: TrustedDevicesApiClient;

    beforeEach(() => {
      trustedDevicesApiClient = new TrustedDevicesApiClient(fakeHttpServices);
    });

    it('should call the SUGGESTIONS_INTERNAL_ROUTE with correct URL and body', async () => {
      await trustedDevicesApiClient.getSuggestions({
        field: 'device.serial_number',
        query: 'test',
      });

      expect(fakeHttpServices.post).toHaveBeenCalledWith(
        resolvePathVariables(SUGGESTIONS_INTERNAL_ROUTE, { suggestion_type: 'trustedDevices' }),
        {
          version: '1',
          body: JSON.stringify({
            field: 'device.serial_number',
            query: 'test',
          }),
        }
      );
    });

    it('should return suggestions from the API', async () => {
      const mockSuggestions = ['device-1', 'device-2', 'device-3'];
      fakeHttpServices.post.mockResolvedValue(mockSuggestions);

      const result = await trustedDevicesApiClient.getSuggestions({
        field: 'device.manufacturer',
        query: 'Apple',
      });

      expect(result).toEqual(mockSuggestions);
    });
  });
});
