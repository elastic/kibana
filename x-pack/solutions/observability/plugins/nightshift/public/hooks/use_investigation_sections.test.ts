/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { InvestigationStatus, Severity } from '@kbn/nightshift-investigations-plugin/common';
import { useFetchInvestigations } from './use_fetch_investigations';
import { useInvestigationSections } from './use_investigation_sections';

jest.mock('./use_fetch_investigations', () => ({
  useFetchInvestigations: jest.fn(),
}));

const mockUseInvestigationSection = useFetchInvestigations as jest.MockedFunction<
  typeof useFetchInvestigations
>;

const sectionResult = ({
  total = 0,
  status,
}: {
  total?: number;
  status?: 'pending' | 'completed' | 'failed';
} = {}) => ({
  investigations:
    status != null
      ? [
          {
            investigation_id: `${status}-1`,
            status,
            created_at: '2026-09-11T09:00:00.000Z',
            subject: { type: 'significant_event' as const, id: 'event-1', summary: status },
          },
        ]
      : [],
  total,
  hasMore: false,
  isInitialLoading: false,
  isFetchingNextPage: false,
  isFetching: false,
  error: null,
  fetchNextPage: jest.fn(),
  refetch: jest.fn(),
});

describe('useInvestigationSections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInvestigationSection.mockImplementation(({ statuses, severities }) => {
      if (statuses.includes('pending')) {
        return sectionResult({ total: 2, status: 'pending' });
      }
      if (severities?.[0] === '80-critical') {
        return sectionResult({ total: 3, status: 'completed' });
      }
      if (severities?.[0] === '60-high') {
        return sectionResult({ total: 1 });
      }
      return sectionResult();
    });
  });

  it('fetches in-progress, then completed-by-severity, then failed', () => {
    const { result } = renderHook(() => useInvestigationSections({ query: 'checkout' }));

    const calls = mockUseInvestigationSection.mock.calls.map(([params]) => ({
      statuses: params.statuses,
      severities: params.severities,
      query: params.query,
    }));

    expect(calls).toEqual([
      {
        statuses: ['pending', 'running'] satisfies InvestigationStatus[],
        severities: undefined,
        query: 'checkout',
      },
      {
        statuses: ['completed'] satisfies InvestigationStatus[],
        severities: ['80-critical'] satisfies Severity[],
        query: 'checkout',
      },
      {
        statuses: ['completed'] satisfies InvestigationStatus[],
        severities: ['60-high'] satisfies Severity[],
        query: 'checkout',
      },
      {
        statuses: ['completed'] satisfies InvestigationStatus[],
        severities: ['40-medium'] satisfies Severity[],
        query: 'checkout',
      },
      {
        statuses: ['completed'] satisfies InvestigationStatus[],
        severities: ['20-low'] satisfies Severity[],
        query: 'checkout',
      },
      {
        statuses: ['failed', 'cancelled'] satisfies InvestigationStatus[],
        severities: undefined,
        query: 'checkout',
      },
    ]);
    expect(result.current.sections.map((section) => section.id)).toEqual([
      'in-progress',
      '80-critical',
      '60-high',
      '40-medium',
      '20-low',
      'failed',
    ]);
  });

  it('keeps failed and cancelled out of the severity sections', () => {
    renderHook(() => useInvestigationSections());

    const severityCalls = mockUseInvestigationSection.mock.calls.filter(
      ([params]) => params.severities != null
    );

    expect(
      severityCalls.every(([params]) => params.statuses.every((status) => status === 'completed'))
    ).toBe(true);
  });

  it('derives tile counts from each severity section total', () => {
    const { result } = renderHook(() => useInvestigationSections());

    expect(result.current.severityCounts).toEqual({
      '80-critical': 3,
      '60-high': 1,
      '40-medium': 0,
      '20-low': 0,
    });
  });

  it('treats a non-empty in-progress section as active', () => {
    const { result } = renderHook(() => useInvestigationSections());

    expect(result.current.hasActiveInvestigations).toBe(true);
  });

  it('polls only the in-progress section, so a paged section is never refetched on a tick', () => {
    renderHook(() => useInvestigationSections());

    expect(
      mockUseInvestigationSection.mock.calls.slice(0, 6).map(([params]) => params.refetchInterval)
    ).toEqual([5_000, undefined, undefined, undefined, undefined, undefined]);
  });

  it('keeps polling in progress while empty so newly started work is picked up', () => {
    mockUseInvestigationSection.mockImplementation(() => sectionResult());

    const { result } = renderHook(() => useInvestigationSections());

    expect(result.current.hasActiveInvestigations).toBe(false);
    expect(mockUseInvestigationSection.mock.calls[0][0].refetchInterval).toBe(5_000);
  });

  const implementationWithInProgressTotal =
    ({
      inProgressTotal,
      refetchCritical,
      refetchFailed,
    }: {
      inProgressTotal: number;
      refetchCritical: jest.Mock;
      refetchFailed: jest.Mock;
    }) =>
    ({ statuses, severities }: { statuses: InvestigationStatus[]; severities?: Severity[] }) => {
      if (statuses.includes('pending')) {
        return inProgressTotal > 0
          ? sectionResult({ total: inProgressTotal, status: 'pending' })
          : sectionResult();
      }
      if (statuses.includes('failed')) {
        return { ...sectionResult({ total: 1, status: 'failed' }), refetch: refetchFailed };
      }
      if (severities?.[0] === '80-critical') {
        return { ...sectionResult({ total: 3 }), refetch: refetchCritical };
      }
      return sectionResult();
    };

  it('refetches the sections work can land in once the last one finishes', () => {
    const refetchCritical = jest.fn();
    const refetchFailed = jest.fn();

    mockUseInvestigationSection.mockImplementation(
      implementationWithInProgressTotal({ inProgressTotal: 1, refetchCritical, refetchFailed })
    );
    const { rerender } = renderHook(() => useInvestigationSections());
    expect(refetchCritical).not.toHaveBeenCalled();
    expect(refetchFailed).not.toHaveBeenCalled();

    mockUseInvestigationSection.mockImplementation(
      implementationWithInProgressTotal({ inProgressTotal: 0, refetchCritical, refetchFailed })
    );
    rerender();

    expect(refetchCritical).toHaveBeenCalledTimes(1);
    expect(refetchFailed).toHaveBeenCalledTimes(1);
  });

  it('refetches when one investigation finishes while others keep running', () => {
    const refetchCritical = jest.fn();
    const refetchFailed = jest.fn();

    mockUseInvestigationSection.mockImplementation(
      implementationWithInProgressTotal({ inProgressTotal: 3, refetchCritical, refetchFailed })
    );
    const { rerender } = renderHook(() => useInvestigationSections());

    mockUseInvestigationSection.mockImplementation(
      implementationWithInProgressTotal({ inProgressTotal: 2, refetchCritical, refetchFailed })
    );
    rerender();

    expect(refetchCritical).toHaveBeenCalledTimes(1);
    expect(refetchFailed).toHaveBeenCalledTimes(1);
  });

  it('does not refetch when new work starts', () => {
    const refetchCritical = jest.fn();
    const refetchFailed = jest.fn();

    mockUseInvestigationSection.mockImplementation(
      implementationWithInProgressTotal({ inProgressTotal: 1, refetchCritical, refetchFailed })
    );
    const { rerender } = renderHook(() => useInvestigationSections());

    mockUseInvestigationSection.mockImplementation(
      implementationWithInProgressTotal({ inProgressTotal: 4, refetchCritical, refetchFailed })
    );
    rerender();

    expect(refetchCritical).not.toHaveBeenCalled();
    expect(refetchFailed).not.toHaveBeenCalled();
  });
  const implementationWithInProgressIds =
    ({
      ids,
      refetchCritical,
      refetchFailed,
    }: {
      ids: string[];
      refetchCritical: jest.Mock;
      refetchFailed: jest.Mock;
    }) =>
    ({ statuses, severities }: { statuses: InvestigationStatus[]; severities?: Severity[] }) => {
      if (statuses.includes('pending')) {
        return {
          ...sectionResult({ total: ids.length }),
          investigations: ids.map((id) => ({
            investigation_id: id,
            status: 'pending' as const,
            created_at: '2026-09-11T09:00:00.000Z',
            subject: { type: 'significant_event' as const, id: 'event-1', summary: 'pending' },
          })),
        };
      }
      if (statuses.includes('failed')) {
        return { ...sectionResult({ total: 1, status: 'failed' }), refetch: refetchFailed };
      }
      if (severities?.[0] === '80-critical') {
        return { ...sectionResult({ total: 3 }), refetch: refetchCritical };
      }
      return sectionResult();
    };

  it('refetches when one finishes as another starts, leaving the in-progress total flat', () => {
    const refetchCritical = jest.fn();
    const refetchFailed = jest.fn();

    mockUseInvestigationSection.mockImplementation(
      implementationWithInProgressIds({
        ids: ['running-a', 'running-b'],
        refetchCritical,
        refetchFailed,
      })
    );
    const { rerender } = renderHook(() => useInvestigationSections());

    mockUseInvestigationSection.mockImplementation(
      implementationWithInProgressIds({
        ids: ['running-b', 'running-c'],
        refetchCritical,
        refetchFailed,
      })
    );
    rerender();

    expect(refetchCritical).toHaveBeenCalledTimes(1);
    expect(refetchFailed).toHaveBeenCalledTimes(1);
  });
  it('does not treat a search change as work finishing, since the rows are a different filter', () => {
    const refetchCritical = jest.fn();
    const refetchFailed = jest.fn();

    mockUseInvestigationSection.mockImplementation(
      implementationWithInProgressIds({
        ids: ['running-a', 'running-b'],
        refetchCritical,
        refetchFailed,
      })
    );
    const { rerender } = renderHook(({ query }) => useInvestigationSections({ query }), {
      initialProps: { query: 'checkout' },
    });

    // A narrower search swaps the in-progress rows wholesale; the other sections are re-keyed by
    // the same query and refetch on their own.
    mockUseInvestigationSection.mockImplementation(
      implementationWithInProgressIds({ ids: ['running-c'], refetchCritical, refetchFailed })
    );
    rerender({ query: 'checkout errors' });

    expect(refetchCritical).not.toHaveBeenCalled();
    expect(refetchFailed).not.toHaveBeenCalled();
  });
});
