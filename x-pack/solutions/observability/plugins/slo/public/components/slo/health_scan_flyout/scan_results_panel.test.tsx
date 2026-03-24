/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { GetHealthScanResultsResponse, HealthScanResultResponse } from '@kbn/slo-schema';
import { ScanResultsPanel } from './scan_results_panel';
import { useGetHealthScanResults } from '../../../hooks/use_get_health_scan_results';
import { useKibana } from '../../../hooks/use_kibana';
import { render } from '../../../utils/test_helper';

jest.mock('../../../hooks/use_get_health_scan_results');
jest.mock('../../../hooks/use_kibana');

const mockUseGetHealthScanResults = useGetHealthScanResults as jest.MockedFunction<
  typeof useGetHealthScanResults
>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const healthyTransform = {
  isProblematic: false,
  missing: false,
  status: 'healthy' as const,
  state: 'started' as const,
  stateMatches: true,
};

const buildScanResult = (
  overrides: Partial<HealthScanResultResponse> = {}
): HealthScanResultResponse => ({
  '@timestamp': '2026-02-27T10:00:00.000Z',
  scanId: 'scan-123',
  spaceId: 'default',
  slo: { id: 'slo-1', name: 'My SLO', revision: 1, enabled: true },
  health: {
    isProblematic: false,
    rollup: { ...healthyTransform },
    summary: { ...healthyTransform },
  },
  ...overrides,
});

const completedScan = (
  overrides: Partial<GetHealthScanResultsResponse['scan']> = {}
): GetHealthScanResultsResponse['scan'] => ({
  scanId: 'scan-123',
  latestTimestamp: '2026-02-27T10:00:00.000Z',
  total: 10,
  problematic: 0,
  status: 'completed',
  ...overrides,
});

describe('ScanResultsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        uiSettings: { get: jest.fn().mockReturnValue('MMM D, YYYY @ HH:mm:ss.SSS') },
        http: { basePath: { prepend: (path: string) => path } },
        notifications: { toasts: { addSuccess: jest.fn(), addError: jest.fn() } },
      },
    } as any);

    mockUseGetHealthScanResults.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
  });

  it('shows loading spinner when loading', () => {
    mockUseGetHealthScanResults.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { container } = render(<ScanResultsPanel scanId="scan-123" />);

    expect(container.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
  });

  it('shows error callout when isError is true', () => {
    mockUseGetHealthScanResults.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(<ScanResultsPanel scanId="scan-123" />);

    expect(screen.getByText('Error loading scan results')).toBeInTheDocument();
    expect(
      screen.getByText('Unable to load the results for this scan. Please try again.')
    ).toBeInTheDocument();
  });

  it('shows "Scan in progress" callout when scan status is pending', () => {
    mockUseGetHealthScanResults.mockReturnValue({
      data: {
        results: [],
        scan: completedScan({ status: 'pending', problematic: 0 }),
        total: 0,
      },
      isLoading: false,
      isError: false,
    });

    render(<ScanResultsPanel scanId="scan-123" />);

    expect(screen.getByText('Scan in progress')).toBeInTheDocument();
  });

  it('shows "All SLOs are healthy" callout when completed with no issues', () => {
    mockUseGetHealthScanResults.mockReturnValue({
      data: {
        results: [],
        scan: completedScan({ status: 'completed', problematic: 0 }),
        total: 10,
      },
      isLoading: false,
      isError: false,
    });

    render(<ScanResultsPanel scanId="scan-123" />);

    expect(screen.getByText('All SLOs are healthy')).toBeInTheDocument();
    expect(
      screen.getByText('No operational issues were found during this scan.')
    ).toBeInTheDocument();
  });

  it('shows "Some SLOs have issues" callout with problematic SLOs table when completed with issues', () => {
    const problematicResult = buildScanResult({
      slo: { id: 'slo-bad', name: 'Bad SLO', revision: 1, enabled: true },
      health: {
        isProblematic: true,
        rollup: {
          isProblematic: true,
          missing: true,
          status: 'unavailable',
          state: 'unavailable',
        },
        summary: { ...healthyTransform },
      },
    });

    mockUseGetHealthScanResults.mockReturnValue({
      data: {
        results: [problematicResult],
        scan: completedScan({ status: 'completed', problematic: 1 }),
        total: 10,
      },
      isLoading: false,
      isError: false,
    });

    render(<ScanResultsPanel scanId="scan-123" />);

    expect(screen.getByText('Some SLOs have issues')).toBeInTheDocument();
    expect(screen.getByText('Problematic SLOs')).toBeInTheDocument();
    expect(screen.getByTestId('healthScanResultsTable')).toBeInTheDocument();
    expect(screen.getByText('Bad SLO')).toBeInTheDocument();
  });

  it('renders correct issue description for missing rollup transform', () => {
    const result = buildScanResult({
      health: {
        isProblematic: true,
        rollup: {
          isProblematic: true,
          missing: true,
          status: 'unavailable',
          state: 'unavailable',
        },
        summary: { ...healthyTransform },
      },
    });

    mockUseGetHealthScanResults.mockReturnValue({
      data: {
        results: [result],
        scan: completedScan({ problematic: 1 }),
        total: 10,
      },
      isLoading: false,
      isError: false,
    });

    render(<ScanResultsPanel scanId="scan-123" />);

    expect(screen.getByText('Missing rollup transform')).toBeInTheDocument();
  });

  it('renders correct issue description for unhealthy summary transform', () => {
    const result = buildScanResult({
      health: {
        isProblematic: true,
        rollup: { ...healthyTransform },
        summary: {
          isProblematic: true,
          missing: false,
          status: 'unhealthy',
          state: 'started',
          stateMatches: true,
        },
      },
    });

    mockUseGetHealthScanResults.mockReturnValue({
      data: {
        results: [result],
        scan: completedScan({ problematic: 1 }),
        total: 10,
      },
      isLoading: false,
      isError: false,
    });

    render(<ScanResultsPanel scanId="scan-123" />);

    expect(screen.getByText('Unhealthy summary transform')).toBeInTheDocument();
  });

  it('renders multiple issues as comma-separated list', () => {
    const result = buildScanResult({
      health: {
        isProblematic: true,
        rollup: {
          isProblematic: true,
          missing: true,
          status: 'unavailable',
          state: 'unavailable',
        },
        summary: {
          isProblematic: true,
          missing: false,
          status: 'unhealthy',
          state: 'started',
          stateMatches: true,
        },
      },
    });

    mockUseGetHealthScanResults.mockReturnValue({
      data: {
        results: [result],
        scan: completedScan({ problematic: 1 }),
        total: 10,
      },
      isLoading: false,
      isError: false,
    });

    render(<ScanResultsPanel scanId="scan-123" />);

    expect(
      screen.getByText('Missing rollup transform, Unhealthy summary transform')
    ).toBeInTheDocument();
  });

  it('shows pagination controls when total problematic SLOs exceed page size', () => {
    const results = Array.from({ length: 25 }, (_, i) =>
      buildScanResult({
        slo: { id: `slo-${i}`, name: `SLO ${i}`, revision: 1, enabled: true },
        health: {
          isProblematic: true,
          rollup: {
            isProblematic: true,
            missing: true,
            status: 'unavailable',
            state: 'unavailable',
          },
          summary: { ...healthyTransform },
        },
      })
    );

    mockUseGetHealthScanResults.mockReturnValue({
      data: {
        results,
        scan: completedScan({ status: 'completed', problematic: 30 }),
        total: 30,
        searchAfter: ['2026-02-27T10:00:00.000Z', 'scan-123', 'default', false, 'slo-24'],
      },
      isLoading: false,
      isError: false,
    });

    render(<ScanResultsPanel scanId="scan-123" />);

    expect(screen.getByText('Showing 1-25 of 30')).toBeInTheDocument();
    expect(screen.getByTestId('healthScanResultsPreviousPage')).toBeDisabled();
    expect(screen.getByTestId('healthScanResultsNextPage')).toBeEnabled();
  });

  it('calls useGetHealthScanResults with searchAfter when Next is clicked', () => {
    const searchAfterCursor = ['2026-02-27T10:00:00.000Z', 'scan-123', 'default', false, 'slo-24'];
    const results = Array.from({ length: 25 }, (_, i) =>
      buildScanResult({
        slo: { id: `slo-${i}`, name: `SLO ${i}`, revision: 1, enabled: true },
        health: {
          isProblematic: true,
          rollup: {
            isProblematic: true,
            missing: true,
            status: 'unavailable',
            state: 'unavailable',
          },
          summary: { ...healthyTransform },
        },
      })
    );

    mockUseGetHealthScanResults.mockImplementation((params) => {
      const hasSearchAfter = params.searchAfter !== undefined;
      return {
        data: {
          results: hasSearchAfter
            ? [
                buildScanResult({
                  slo: { id: 'slo-25', name: 'SLO 25', revision: 1, enabled: true },
                }),
              ]
            : results,
          scan: completedScan({ status: 'completed', problematic: 30 }),
          total: 30,
          searchAfter: hasSearchAfter ? undefined : searchAfterCursor,
        },
        isLoading: false,
        isError: false,
      };
    });

    render(<ScanResultsPanel scanId="scan-123" />);

    fireEvent.click(screen.getByTestId('healthScanResultsNextPage'));

    expect(mockUseGetHealthScanResults).toHaveBeenLastCalledWith(
      expect.objectContaining({
        scanId: 'scan-123',
        searchAfter: JSON.stringify(searchAfterCursor),
        size: 25,
      })
    );
  });
});
