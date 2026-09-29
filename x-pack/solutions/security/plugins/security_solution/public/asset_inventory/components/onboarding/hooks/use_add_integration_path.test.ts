/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useAddIntegrationPath } from './use_add_integration_path';

const mockGetUrlForApp = vi.fn();
const mockUseAssetDiscoveryIntegration = vi.fn();

vi.mock('../../../../common/lib/kibana', () => {
  const mocked = {
    useKibana: () => ({
      services: {
        application: { getUrlForApp: mockGetUrlForApp },
      },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./use_get_asset_discovery_integration', () => {
  const mocked = {
    useAssetDiscoveryIntegration: () => mockUseAssetDiscoveryIntegration(),
  };
  return { ...mocked, default: mocked };
});

describe('useAddIntegrationPath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns asset discovery integration path if available', () => {
    mockUseAssetDiscoveryIntegration.mockReturnValue({
      path: undefined,
      isLoading: false,
      isError: false,
      error: undefined,
    });
    mockGetUrlForApp.mockReturnValue('/integrations-path');

    const { result } = renderHook(() => useAddIntegrationPath());
    expect(result.current.addIntegrationPath).toBe(
      '/integrations-path/browse/security/asset_inventory'
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('forwards loading and error states', () => {
    mockUseAssetDiscoveryIntegration.mockReturnValue({
      path: undefined,
      isLoading: true,
      isError: true,
      error: 'something went wrong',
    });
    mockGetUrlForApp.mockReturnValue('/integrations-path');

    const { result } = renderHook(() => useAddIntegrationPath());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe('something went wrong');
  });
});
