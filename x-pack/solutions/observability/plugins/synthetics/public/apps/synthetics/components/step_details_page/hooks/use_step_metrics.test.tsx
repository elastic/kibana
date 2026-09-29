/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useStepMetrics } from './use_step_metrics';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';

const mockUseReduxEsSearch = vi.fn();
vi.mock('../../../hooks/use_redux_es_search', () => {
  const mocked = {
    useReduxEsSearch: (...args: any[]) => mockUseReduxEsSearch(...args),
  };
  return { ...mocked, default: mocked };
});

const mockUrlParams = vi.fn();
vi.mock('../../../hooks', () => {
  const mocked = {
    useGetUrlParams: () => mockUrlParams(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('react-router-dom', () => {
  const mocked = {
    useParams: () => ({ checkGroupId: 'cg-1', stepIndex: '2' }),
  };
  return { ...mocked, default: mocked };
});

describe('useStepMetrics', () => {
  beforeEach(() => {
    mockUrlParams.mockReturnValue({});
    mockUseReduxEsSearch.mockReturnValue({ data: undefined, loading: false });
  });

  afterEach(() => vi.clearAllMocks());

  it('queries the local synthetics index pattern when no remoteName is provided', () => {
    renderHook(() => useStepMetrics());

    expect(mockUseReduxEsSearch).toHaveBeenCalledTimes(2);
    expect(mockUseReduxEsSearch).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ index: SYNTHETICS_INDEX_PATTERN }),
      [undefined],
      expect.any(Object)
    );
    expect(mockUseReduxEsSearch).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ index: SYNTHETICS_INDEX_PATTERN }),
      [undefined],
      expect.any(Object)
    );
  });

  it('queries the CCS-prefixed index when remoteName is in the URL', () => {
    mockUrlParams.mockReturnValue({ remoteName: 'remote-a' });

    renderHook(() => useStepMetrics());

    expect(mockUseReduxEsSearch).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ index: `remote-a:${SYNTHETICS_INDEX_PATTERN}` }),
      expect.arrayContaining(['remote-a']),
      expect.any(Object)
    );
    expect(mockUseReduxEsSearch).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ index: `remote-a:${SYNTHETICS_INDEX_PATTERN}` }),
      expect.arrayContaining(['remote-a']),
      expect.any(Object)
    );
  });

  it('formats transfer size, FCP, and LCP from Elasticsearch aggregations', () => {
    mockUseReduxEsSearch.mockImplementation(
      (_params: unknown, _deps: unknown, options: { name: string }) => {
        if (options.name.startsWith('stepMetricsFromNetworkInfos')) {
          return {
            data: { aggregations: { transferSize: { value: 558 * 1024 } } },
            loading: false,
          };
        }

        return {
          data: {
            aggregations: {
              fcp: { value: 402_000 },
              lcp: { value: 521_000 },
              cls: { value: 0 },
              dcl: { value: 0 },
              totalDuration: { value: 0 },
            },
          },
          loading: false,
        };
      }
    );

    const { result } = renderHook(() => useStepMetrics());
    const metricsByTestSubj = Object.fromEntries(
      result.current.metrics.map((metric) => [metric.dataTestSubj, metric])
    );

    expect(metricsByTestSubj['synth-step-metric-transfer-size']?.formatted).toBe('558 KB');
    expect(metricsByTestSubj['synth-step-metric-fcp']?.formatted).toBe('402 ms');
    expect(metricsByTestSubj['synth-step-metric-lcp']?.formatted).toBe('521 ms');
  });

  it('formats transfer size as 0 Bytes when network aggregations are missing', () => {
    const { result } = renderHook(() => useStepMetrics());
    const transferSize = result.current.metrics.find(
      (metric) => metric.dataTestSubj === 'synth-step-metric-transfer-size'
    );

    expect(transferSize?.formatted).toBe('0 Bytes');
  });
});
