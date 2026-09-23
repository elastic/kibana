/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useFetchCoverageOverviewQuery } from './use_fetch_coverage_overview_query';
import { useMitreConfiguration } from '../../../../common/hooks/mitre/use_mitre_configuration';
import { fetchCoverageOverview } from '../api';
import {
  createEmptyMitreConfiguration,
  createPopulatedMitreConfiguration,
} from '../../../../common/hooks/mitre/use_mitre_configuration.mock';

jest.mock('../../../../common/hooks/mitre/use_mitre_configuration');
jest.mock('../api', () => ({
  fetchCoverageOverview: jest.fn(),
}));
jest.mock('../../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({ addError: jest.fn() }),
}));

const mockUseMitreConfiguration = useMitreConfiguration as jest.Mock;
const mockFetchCoverageOverview = fetchCoverageOverview as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'TestQueryClientWrapper';
  return Wrapper;
};

describe('useFetchCoverageOverviewQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchCoverageOverview.mockResolvedValue({ coverage: {} });
  });

  describe('when MITRE configuration fetch fails', () => {
    it('returns isLoading:false and isMitreError:true so the error callout renders (not the spinner)', () => {
      // Simulate MITRE error state: isError:true, isLoading:false, no data
      mockUseMitreConfiguration.mockReturnValue(
        createEmptyMitreConfiguration({ isError: true, isLoading: false })
      );

      const { result } = renderHook(() => useFetchCoverageOverviewQuery(), {
        wrapper: createWrapper(),
      });

      // The coverage query is disabled (mitreReady=false), so queryResult.isInitialLoading=false.
      // Combined isLoading must also be false so the dashboard shows the callout, not the spinner.
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isMitreError).toBe(true);
    });
  });

  describe('healthy path', () => {
    it('reports isLoading:true while the coverage request is in flight', async () => {
      // Simulate MITRE loaded successfully
      mockUseMitreConfiguration.mockReturnValue(createPopulatedMitreConfiguration());

      // Make the coverage fetch pend indefinitely so the query stays in-flight
      mockFetchCoverageOverview.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useFetchCoverageOverviewQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        // The query is enabled and actively fetching → isInitialLoading:true → isLoading:true
        expect(result.current.isLoading).toBe(true);
      });
      expect(result.current.isMitreError).toBe(false);
    });
  });
});
