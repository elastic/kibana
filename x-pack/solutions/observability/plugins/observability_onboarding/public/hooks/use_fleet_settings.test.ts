/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFleetSettings } from './use_fleet_settings';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

describe('useFleetSettings', () => {
  const mockGet = jest.fn();

  const createMockServices = (overrides = {}) => ({
    services: {
      http: {
        get: mockGet,
      },
      fleet: {
        authz: {
          fleet: {
            readSettings: true,
          },
        },
      },
      ...overrides,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue(createMockServices());
  });

  it('returns prereleaseIntegrationsEnabled as true when setting is enabled', async () => {
    mockGet.mockResolvedValue({
      item: {
        prerelease_integrations_enabled: true,
      },
    });

    const { result } = renderHook(() => useFleetSettings());

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.prereleaseIntegrationsEnabled).toBe(true);
    expect(result.current.error).toBeNull();
    expect(mockGet).toHaveBeenCalledWith('/api/fleet/settings', {
      headers: { 'Elastic-Api-Version': '2023-10-31' },
    });
  });

  it('returns prereleaseIntegrationsEnabled as false when setting is disabled', async () => {
    mockGet.mockResolvedValue({
      item: {
        prerelease_integrations_enabled: false,
      },
    });

    const { result } = renderHook(() => useFleetSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.prereleaseIntegrationsEnabled).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('defaults to false when setting is undefined', async () => {
    mockGet.mockResolvedValue({
      item: {},
    });

    const { result } = renderHook(() => useFleetSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.prereleaseIntegrationsEnabled).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('defaults to false and sets error when API call fails', async () => {
    const error = new Error('API Error');
    mockGet.mockRejectedValue(error);

    const { result } = renderHook(() => useFleetSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.prereleaseIntegrationsEnabled).toBe(false);
    expect(result.current.error).toEqual(error);
  });

  it('defaults to false when http service is not available', async () => {
    (useKibana as jest.Mock).mockReturnValue(
      createMockServices({
        http: undefined,
      })
    );

    const { result } = renderHook(() => useFleetSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.prereleaseIntegrationsEnabled).toBe(false);
  });

  it('defaults to false when user lacks readSettings permission', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: {
          get: mockGet,
        },
        fleet: {
          authz: {
            fleet: {
              readSettings: false,
            },
          },
        },
      },
    });

    const { result } = renderHook(() => useFleetSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.prereleaseIntegrationsEnabled).toBe(false);
    // Should not make API call when user lacks permission
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('defaults to false when fleet service is not available', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: {
          get: mockGet,
        },
        fleet: undefined,
      },
    });

    const { result } = renderHook(() => useFleetSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.prereleaseIntegrationsEnabled).toBe(false);
    // Should not make API call when fleet is not available
    expect(mockGet).not.toHaveBeenCalled();
  });
});
