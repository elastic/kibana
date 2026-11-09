/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { MitreFramework } from '@kbn/security-mitre-attack-common';
import { buildMockMitreTacticSummary } from '@kbn/security-mitre-attack-mocks';
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
    it('returns isLoading:false and isMitreError:true so the error callout renders (not the spinner)', async () => {
      // Simulate MITRE error state: isError:true, isLoading:false, no data
      mockUseMitreConfiguration.mockReturnValue(
        createEmptyMitreConfiguration({ isError: true, isLoading: false })
      );

      const { result } = renderHook(() => useFetchCoverageOverviewQuery(), {
        wrapper: createWrapper(),
      });

      // The coverage POST is independent of MITRE, so wait for it to settle; the combined
      // isLoading must then be false so the dashboard shows the callout, not the spinner.
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.data).toBeUndefined();
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

  describe('framework switching', () => {
    const atlasTactic = buildMockMitreTacticSummary({
      framework: 'atlas',
      framework_version: '2026.8',
      id: 'AML.TA0000',
      name: 'AI Model Access',
    });

    const mockConfigByFramework = (
      atlasOverrides: Parameters<typeof createEmptyMitreConfiguration>[0] = {}
    ) => {
      mockUseMitreConfiguration.mockImplementation((params?: { framework?: MitreFramework }) =>
        params?.framework === 'atlas'
          ? createPopulatedMitreConfiguration({
              tactics: [atlasTactic],
              techniques: [],
              subtechniques: [],
              frameworkVersion: '2026.8',
              ...atlasOverrides,
            })
          : createPopulatedMitreConfiguration()
      );
    };

    const filter = {};

    beforeEach(() => {
      mockFetchCoverageOverview.mockResolvedValue({
        coverage: {},
        rules_data: {},
        unmapped_rule_ids: [],
        invalid_mitre_ids: {},
      });
    });

    it('derives the model per framework without refetching the coverage request', async () => {
      mockConfigByFramework();

      const { result, rerender } = renderHook(
        ({ framework }: { framework: MitreFramework }) =>
          useFetchCoverageOverviewQuery(filter, framework),
        { wrapper: createWrapper(), initialProps: { framework: 'enterprise' as MitreFramework } }
      );

      await waitFor(() => expect(result.current.data).toBeDefined());
      expect(result.current.data?.mitreTactics[0].id).toBe('TA0001');

      rerender({ framework: 'atlas' });

      await waitFor(() => expect(result.current.data?.mitreTactics[0].id).toBe('AML.TA0000'));
      expect(mockFetchCoverageOverview).toHaveBeenCalledTimes(1);
    });

    it('reports isMitreError and no data when the ATLAS config fails, without affecting enterprise', async () => {
      mockConfigByFramework({ isError: true, tactics: [] });

      const { result, rerender } = renderHook(
        ({ framework }: { framework: MitreFramework }) =>
          useFetchCoverageOverviewQuery(filter, framework),
        { wrapper: createWrapper(), initialProps: { framework: 'enterprise' as MitreFramework } }
      );

      await waitFor(() => expect(result.current.data).toBeDefined());
      expect(result.current.isMitreError).toBe(false);

      rerender({ framework: 'atlas' });

      await waitFor(() => expect(result.current.isMitreError).toBe(true));
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });

    it('passes frameworkVersion through from the MITRE configuration', async () => {
      mockConfigByFramework();

      const { result, rerender } = renderHook(
        ({ framework }: { framework: MitreFramework }) =>
          useFetchCoverageOverviewQuery(filter, framework),
        { wrapper: createWrapper(), initialProps: { framework: 'enterprise' as MitreFramework } }
      );

      expect(result.current.frameworkVersion).toBe('16.1');

      rerender({ framework: 'atlas' });

      expect(result.current.frameworkVersion).toBe('2026.8');
    });
  });
});
