/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { ENTITY_STORE_ROUTES } from '@kbn/entity-store/public';

import { useEntityAnalyticsRoutes } from './api';
import { useKibana } from '../../common/lib/kibana/kibana_react';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

jest.mock('../../common/lib/kibana/kibana_react', () => ({
  useKibana: jest.fn(),
}));
jest.mock('../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

const mockFetch = jest.fn();
const useKibanaMock = useKibana as jest.Mock;
const useExperimentalMock = useIsExperimentalFeatureEnabled as jest.Mock;

describe('useEntityAnalyticsRoutes — executionContext propagation on v2 branch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({ services: { http: { fetch: mockFetch } } });
  });

  it('threads context into the maintainers request when fetchRiskEngineStatus is called on the v2 path', async () => {
    // Enable the entity-store v2 flag so fetchRiskEngineStatus takes the v2 branch
    // and delegates to fetchRiskScoreMaintainer -> fetchEntityMaintainers.
    useExperimentalMock.mockReturnValue(true);
    // fetchEntityMaintainers returns { maintainers: [...] }; empty array is fine here.
    mockFetch.mockResolvedValue({ maintainers: [] });

    const { result } = renderHook(() => useEntityAnalyticsRoutes());

    const context = { name: 'risk-engine-status', id: 'panel-1' };
    await result.current.fetchRiskEngineStatus({ context });

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockFetch).toHaveBeenCalledWith(
      ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_GET,
      expect.objectContaining({ context })
    );
  });

  it('threads context into the classic status request when fetchRiskEngineStatus is called with v2 disabled', async () => {
    // With v2 disabled, the wrapper falls through to a single http.fetch on RISK_ENGINE_STATUS_URL.
    useExperimentalMock.mockReturnValue(false);
    mockFetch.mockResolvedValue({ risk_engine_status: 'NOT_INSTALLED' });

    const { result } = renderHook(() => useEntityAnalyticsRoutes());

    const context = { name: 'risk-engine-status', id: 'panel-1' };
    await result.current.fetchRiskEngineStatus({ context });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ context })
    );
  });
});
