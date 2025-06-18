/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAddIntegrationPath } from './use_add_integration_path';

const mockGetUrlForApp = jest.fn();
const mockUseAssetDiscoveryIntegration = jest.fn();

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      application: { getUrlForApp: mockGetUrlForApp },
    },
  }),
}));

jest.mock('./use_get_asset_discovery_integration', () => ({
  useAssetDiscoveryIntegration: () => mockUseAssetDiscoveryIntegration(),
}));

describe('useAddIntegrationPath', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns asset discovery integration path if available', () => {
    mockUseAssetDiscoveryIntegration.mockReturnValue({
      path: '/asset-discovery-path',
      isLoading: false,
      isError: false,
      error: undefined,
    });
    mockGetUrlForApp.mockReturnValue('/integrations-path');

    const { result } = renderHook(() => useAddIntegrationPath());
    expect(result.current.addIntegrationPath).toBe('/asset-discovery-path');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('returns integrations app path if asset discovery integration path is not available', () => {
    mockUseAssetDiscoveryIntegration.mockReturnValue({
      path: undefined,
      isLoading: false,
      isError: false,
      error: undefined,
    });
    mockGetUrlForApp.mockReturnValue('/integrations-path');

    const { result } = renderHook(() => useAddIntegrationPath());
    expect(result.current.addIntegrationPath).toBe('/integrations-path');
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
