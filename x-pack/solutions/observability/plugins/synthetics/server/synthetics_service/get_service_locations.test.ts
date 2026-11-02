/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import axios from 'axios';
import { getServiceLocations } from './get_service_locations';

import { BandwidthLimitKey, LocationStatus } from '../../common/runtime_types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockSuccessResponse = {
  data: {
    throttling: {
      [BandwidthLimitKey.DOWNLOAD]: 100,
      [BandwidthLimitKey.UPLOAD]: 50,
    },
    locations: {
      us_central: {
        url: 'https://local.dev',
        geo: {
          name: 'US Central',
          location: { lat: 41.25, lon: -95.86 },
        },
        status: LocationStatus.GA,
      },
      us_east: {
        url: 'https://local.dev',
        geo: {
          name: 'US East',
          location: { lat: 41.25, lon: -95.86 },
        },
        status: LocationStatus.EXPERIMENTAL,
      },
    },
  },
};

// @ts-ignore - only mocking the properties needed for testing
const createMockServer = (): any => ({
  isDev: true,
  config: {
    service: {
      manifestUrl: 'http://local.dev',
    },
    enabled: true,
  },
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
});

describe('getServiceLocations', function () {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return all locations on successful first attempt', async () => {
    mockedAxios.get.mockResolvedValue(mockSuccessResponse);

    const mockServer = createMockServer();
    const locationsPromise = getServiceLocations(mockServer);

    // Run all timers to completion
    await jest.runAllTimersAsync();
    const locations = await locationsPromise;

    expect(locations).toEqual({
      throttling: {
        [BandwidthLimitKey.DOWNLOAD]: 100,
        [BandwidthLimitKey.UPLOAD]: 50,
      },
      locations: [
        {
          geo: {
            lat: 41.25,
            lon: -95.86,
          },
          id: 'us_central',
          isInvalid: false,
          label: 'US Central',
          url: 'https://local.dev',
          isServiceManaged: true,
          status: LocationStatus.GA,
        },
        {
          geo: {
            lat: 41.25,
            lon: -95.86,
          },
          id: 'us_east',
          isInvalid: false,
          label: 'US East',
          url: 'https://local.dev',
          isServiceManaged: true,
          status: LocationStatus.EXPERIMENTAL,
        },
      ],
    });
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockServer.logger.error).not.toHaveBeenCalled();
  });

  it('should retry on failure and succeed on subsequent attempt', async () => {
    const networkError = new Error('getaddrinfo EAI_AGAIN manifest.synthetics.elastic-cloud.com');
    mockedAxios.get
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce(mockSuccessResponse);

    const mockServer = createMockServer();
    const locationsPromise = getServiceLocations(mockServer);

    // Run all timers to completion
    await jest.runAllTimersAsync();
    const locations = await locationsPromise;

    expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    expect(mockServer.logger.debug).toHaveBeenCalledTimes(2);
    expect(mockServer.logger.error).not.toHaveBeenCalled();
    expect(locations.locations).toHaveLength(2);
  });

  it('should log error only after all retries are exhausted', async () => {
    const networkError = new Error('getaddrinfo EAI_AGAIN manifest.synthetics.elastic-cloud.com');
    mockedAxios.get.mockRejectedValue(networkError);

    const mockServer = createMockServer();
    const locationsPromise = getServiceLocations(mockServer);

    // Run all timers to completion
    await jest.runAllTimersAsync();
    const locations = await locationsPromise;

    // Initial attempt + 3 retries = 4 total calls
    expect(mockedAxios.get).toHaveBeenCalledTimes(4);
    // Debug logs for each failed attempt
    expect(mockServer.logger.debug).toHaveBeenCalledTimes(4);
    // Error logged only once after all retries exhausted
    expect(mockServer.logger.error).toHaveBeenCalledTimes(1);
    expect(mockServer.logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error getting available Synthetics locations'),
      expect.any(Object)
    );
    expect(locations).toEqual({ locations: [] });
  });

  it('should succeed on first retry after initial failure', async () => {
    const networkError = new Error('Network error');
    mockedAxios.get.mockRejectedValueOnce(networkError).mockResolvedValueOnce(mockSuccessResponse);

    const mockServer = createMockServer();
    const locationsPromise = getServiceLocations(mockServer);

    // Run all timers to completion
    await jest.runAllTimersAsync();
    const locations = await locationsPromise;

    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    expect(mockServer.logger.debug).toHaveBeenCalledTimes(1);
    expect(mockServer.logger.error).not.toHaveBeenCalled();
    expect(locations.locations).toHaveLength(2);
  });

  it('should return dev locations and empty array when manifestUrl is not provided', async () => {
    const mockServer = {
      isDev: true,
      config: {
        service: {
          devUrl: 'http://dev.local',
        },
        enabled: true,
      },
      logger: {
        error: jest.fn(),
        debug: jest.fn(),
      },
    } as any;

    const locations = await getServiceLocations(mockServer);

    expect(mockedAxios.get).not.toHaveBeenCalled();
    expect(locations.locations).toHaveLength(2);
    expect(locations.locations[0].id).toBe('dev');
    expect(locations.locations[1].id).toBe('dev2');
  });

  it('should return empty locations when manifestUrl is mockDevUrl', async () => {
    const mockServer = {
      isDev: true,
      config: {
        service: {
          manifestUrl: 'mockDevUrl',
        },
        enabled: true,
      },
      logger: {
        error: jest.fn(),
        debug: jest.fn(),
      },
    } as any;

    const locations = await getServiceLocations(mockServer);

    expect(mockedAxios.get).not.toHaveBeenCalled();
    expect(locations).toEqual({ locations: [] });
  });
});
