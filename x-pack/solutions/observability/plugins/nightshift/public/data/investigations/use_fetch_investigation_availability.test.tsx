/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';
import { useFetchInvestigationAvailability } from './use_fetch_investigation_availability';

jest.mock('../../hooks/use_kibana');

const mockUseKibana = useKibana as jest.Mock;
const investigationsFetch = jest.fn();

const renderAvailability = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useFetchInvestigationAvailability(), { wrapper });
};

describe('useFetchInvestigationAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        nightshiftInvestigations: { investigationsClient: { fetch: investigationsFetch } },
      },
    });
  });

  it('is available when the route says so', async () => {
    investigationsFetch.mockResolvedValue({ available: true });
    const { result } = renderAvailability();

    await waitFor(() => expect(result.current.isAvailable).toBe(true));
  });

  it('is unavailable when the route says so', async () => {
    investigationsFetch.mockResolvedValue({ available: false });
    const { result } = renderAvailability();

    await waitFor(() => expect(investigationsFetch).toHaveBeenCalledTimes(1));
    expect(result.current.isAvailable).toBe(false);
  });

  it('is unavailable when the user is not allowed to start investigations', async () => {
    investigationsFetch.mockRejectedValue(new Error('Forbidden'));
    const { result } = renderAvailability();

    await waitFor(() => expect(investigationsFetch).toHaveBeenCalledTimes(1));
    expect(result.current.isAvailable).toBe(false);
  });

  it('reports loading until the first read settles', async () => {
    investigationsFetch.mockResolvedValue({ available: true });
    const { result } = renderAvailability();

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('is unavailable without the investigations plugin', () => {
    mockUseKibana.mockReturnValue({ services: {} });
    const { result } = renderAvailability();

    expect(result.current.isAvailable).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(investigationsFetch).not.toHaveBeenCalled();
  });
});
