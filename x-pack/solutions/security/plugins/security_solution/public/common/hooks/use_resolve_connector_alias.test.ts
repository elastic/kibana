/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useResolveConnectorAlias } from './use_resolve_connector_alias';
import { useKibana } from '../lib/kibana';

jest.mock('../lib/kibana');

const mockUseKibana = useKibana as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useResolveConnectorAlias', () => {
  const aliasId = '.custom-stack-connector';
  let mockHttpGet: jest.Mock;

  const renderUseResolveConnectorAlias = (params: {
    connectorId: string | undefined;
    enabled: boolean;
  }) => renderHook(() => useResolveConnectorAlias(params), { wrapper: createWrapper() });

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttpGet = jest.fn().mockResolvedValue({
      connector: { connectorId: 'custom-inference-endpoint' },
    });
    mockUseKibana.mockReturnValue({ services: { http: { get: mockHttpGet } } });
  });

  it('should return the id the connector resolves to', async () => {
    const { result } = renderUseResolveConnectorAlias({ connectorId: aliasId, enabled: true });

    await waitFor(() =>
      expect(result.current.resolvedConnectorId).toBe('custom-inference-endpoint')
    );
    expect(mockHttpGet).toHaveBeenCalledWith(
      `/internal/inference/connectors/${encodeURIComponent(aliasId)}`
    );
  });

  it('should report resolving until the lookup completes', async () => {
    const { result } = renderUseResolveConnectorAlias({ connectorId: aliasId, enabled: true });

    expect(result.current.isResolving).toBe(true);
    await waitFor(() => expect(result.current.isResolving).toBe(false));
  });

  it('should return an undefined id when the lookup fails', async () => {
    mockHttpGet.mockRejectedValue(new Error('Not found'));

    const { result } = renderUseResolveConnectorAlias({ connectorId: aliasId, enabled: true });

    await waitFor(() => expect(result.current.isResolving).toBe(false));
    expect(result.current.resolvedConnectorId).toBeUndefined();
  });

  it('should not make a request when disabled', () => {
    const { result } = renderUseResolveConnectorAlias({ connectorId: aliasId, enabled: false });

    expect(mockHttpGet).not.toHaveBeenCalled();
    expect(result.current.isResolving).toBe(false);
    expect(result.current.resolvedConnectorId).toBeUndefined();
  });

  it('should not make a request when there is no connector id', () => {
    renderUseResolveConnectorAlias({ connectorId: undefined, enabled: true });

    expect(mockHttpGet).not.toHaveBeenCalled();
  });
});
