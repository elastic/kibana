/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { READINESS_API_PATH } from '../../../common/threat_intel';
import { useCuratedIndicatorAlias, useDefaultThreatIndices } from './use_curated_indicator_alias';

const mockHttpGet = jest.fn();
const mockUseUiSetting = jest.fn();
jest.mock('../lib/kibana', () => ({
  useKibana: () => ({ services: { http: { get: mockHttpGet } } }),
  useUiSetting$: () => mockUseUiSetting(),
}));

const ALIAS = '.threat-intel-indicators-default';

const wrapper = ({ children }: React.PropsWithChildren<{}>) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('useCuratedIndicatorAlias', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the alias when the pipeline is ready', async () => {
    mockHttpGet.mockResolvedValue({ status: 'ready', indicatorAlias: ALIAS });

    const { result } = renderHook(() => useCuratedIndicatorAlias(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.indicatorAlias).toBe(ALIAS);
    expect(mockHttpGet).toHaveBeenCalledWith(
      READINESS_API_PATH,
      expect.objectContaining({ version: '1' })
    );
  });

  it('returns the alias when the pipeline is degraded', async () => {
    mockHttpGet.mockResolvedValue({ status: 'degraded', indicatorAlias: ALIAS });

    const { result } = renderHook(() => useCuratedIndicatorAlias(), { wrapper });

    await waitFor(() => expect(result.current.indicatorAlias).toBe(ALIAS));
  });

  it('ignores the alias when the pipeline is blocked', async () => {
    mockHttpGet.mockResolvedValue({ status: 'blocked', indicatorAlias: ALIAS });

    const { result } = renderHook(() => useCuratedIndicatorAlias(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.indicatorAlias).toBeUndefined();
  });

  it('resolves to no alias when the route is absent, as when the supply pipeline is off', async () => {
    mockHttpGet.mockRejectedValue(new Error('Not Found'));

    const { result } = renderHook(() => useCuratedIndicatorAlias(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.indicatorAlias).toBeUndefined();
  });
});

describe('useDefaultThreatIndices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUiSetting.mockReturnValue([['logs-ti_*']]);
  });

  it('appends the curated alias to the configured threat indices', async () => {
    mockHttpGet.mockResolvedValue({ status: 'ready', indicatorAlias: ALIAS });

    const { result } = renderHook(() => useDefaultThreatIndices(), { wrapper });

    await waitFor(() => expect(result.current.threatIndices).toEqual(['logs-ti_*', ALIAS]));
  });

  it('returns only the configured threat indices when there is no alias', async () => {
    mockHttpGet.mockRejectedValue(new Error('Not Found'));

    const { result } = renderHook(() => useDefaultThreatIndices(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.threatIndices).toEqual(['logs-ti_*']);
  });
});
