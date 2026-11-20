/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@kbn/react-query';
import type { Severity, SeverityCounts } from '@kbn/nightshift-investigations-plugin/common';
import type {
  InvestigationSeverityCounts,
  InvestigationSummary,
  ListInvestigationsResponse,
} from '@kbn/agentic-investigations-plugin/common';
import { useStatusSignal } from '@kbn/agentic-investigations-plugin/public';
import {
  SHARED_INVESTIGATIONS_API_VERSION,
  SHARED_INVESTIGATIONS_SEVERITY_COUNTS_URL,
  SHARED_INVESTIGATIONS_URL,
} from './shared_investigations_api';
import { useKibana } from '../../hooks/use_kibana';
import {
  NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY,
  useFetchInvestigations,
  type FetchInvestigationsResult,
} from './use_fetch_investigations';

/**
 * Only the in-progress section polls. It is the one section that changes on its own, and the
 * only one shallow enough to refetch cheaply — a refetch re-requests every loaded page, so
 * polling a section the user has paged through multiplies requests per tick. The others are
 * refetched on the edge where work leaves this section instead.
 */
const IN_PROGRESS_REFETCH_INTERVAL_MS = 5_000;

/** How long the space-wide open-investigation probe stays fresh. */
const SPACE_OPEN_INVESTIGATIONS_STALE_TIME_MS = 30_000;

/**
 * `not-rated` holds the investigations nothing works on that have no severity: the agent did not
 * record one, for example because its run ended early. There is no failed state.
 */
export type InvestigationSectionId = 'in-progress' | Severity | 'not-rated';

export interface InvestigationSectionState extends FetchInvestigationsResult {
  id: InvestigationSectionId;
}

export interface InvestigationSectionsResult {
  sections: InvestigationSectionState[];
  severityCounts: SeverityCounts;
  /**
   * Open finished counts with the page time window but without the search query.
   * Tiles use this so a filter that zeros a tier does not treat that tier as never present.
   */
  unfilteredSeverityCounts: SeverityCounts;
  /** The counts query is separate from the sections, so it settles on its own schedule. */
  areSeverityCountsLoading: boolean;
  /** True while the no-search baseline counts are still loading under an active search. */
  areUnfilteredSeverityCountsLoading: boolean;
  /** New filters are loading while the counts still show the previous ones. */
  areSeverityCountsStale: boolean;
  /** True when the finished open counts could not be loaded — do not treat zeros as a clear backlog. */
  hasSeverityCountsError: boolean;
  hasActiveInvestigations: boolean;
  /** Running investigations per the API total (not capped by the in-progress page size). */
  activeInvestigationCount: number;
  /**
   * True when the space has at least one open investigation in any time range (ignores the
   * landing window and search). Used to keep filters usable when the window alone is empty.
   */
  hasOpenInvestigationsInSpace: boolean;
  /** True until the space-wide open-investigation probe has settled. */
  areSpaceInvestigationsLoading: boolean;
  isInitialLoading: boolean;
  isFetching: boolean;
  /** Investigations matching the current filters, each counted once: the sections are disjoint. */
  totalCount: number;
  loadedCount: number;
  refetchAll: () => void;
}

const toInvestigationIds = (investigations: InvestigationSummary[]): Set<string> =>
  new Set(investigations.map(({ id }) => id));

const tierSection = (severity: Severity) => ({
  inProgress: false,
  severities: [severity],
});

const toSeverityCounts = (counts: InvestigationSeverityCounts | undefined): SeverityCounts => ({
  critical: counts?.critical ?? 0,
  high: counts?.high ?? 0,
  medium: counts?.medium ?? 0,
  low: counts?.low ?? 0,
});

const toSectionState = ({
  id,
  queryResult,
}: {
  id: InvestigationSectionId;
  queryResult: FetchInvestigationsResult;
}): InvestigationSectionState => ({
  id,
  ...queryResult,
});

export const useInvestigationSections = ({
  query,
  updatedAfter,
  updatedBefore,
}: {
  query?: string;
  /** Only investigations last modified within this window (ISO 8601). */
  updatedAfter?: string;
  updatedBefore?: string;
} = {}): InvestigationSectionsResult => {
  const updatedWindow = { updatedAfter, updatedBefore };
  // Changing any filter starts a different list, so it is not a finished investigation.
  const filterKey = JSON.stringify([query, updatedAfter, updatedBefore]);
  const { http, agenticInvestigations } = useKibana().services;

  // A running investigation's `updated_at` does not move with tool calls, so a window ending at
  // now would hide work that is happening right now. Treat it as modified "now": only a range that
  // ended in the past filters the in-progress section.
  const inProgressWindow = updatedBefore ? updatedWindow : {};
  const inProgress = useFetchInvestigations({
    inProgress: true,
    query,
    ...inProgressWindow,
    refetchInterval: IN_PROGRESS_REFETCH_INTERVAL_MS,
  });

  // Use the API total so the hero is not capped by the in-progress page size.
  const activeInvestigationCount = inProgress.matchTotal;
  const hasActiveInvestigations = activeInvestigationCount > 0;

  const critical = useFetchInvestigations({ ...tierSection('critical'), query, ...updatedWindow });
  const high = useFetchInvestigations({ ...tierSection('high'), query, ...updatedWindow });
  const medium = useFetchInvestigations({ ...tierSection('medium'), query, ...updatedWindow });
  const low = useFetchInvestigations({ ...tierSection('low'), query, ...updatedWindow });
  const notRated = useFetchInvestigations({
    inProgress: false,
    severities: ['none'],
    query,
    ...updatedWindow,
  });

  const hasSearchQuery = Boolean(query?.trim());
  const severityCountsTimeQuery = {
    ...(updatedAfter ? { updated_after: updatedAfter } : {}),
    ...(updatedBefore ? { updated_before: updatedBefore } : {}),
  };

  // Existence across the whole space, ignoring the landing time window — so filters stay when a
  // narrow range empties the list but older open investigations still exist.
  const spaceOpenInvestigationsQuery = useQuery({
    queryKey: [...NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY, 'spaceOpenInvestigations'],
    enabled: agenticInvestigations != null,
    queryFn: async ({ signal }) => {
      const response = await http.get<ListInvestigationsResponse>(SHARED_INVESTIGATIONS_URL, {
        version: SHARED_INVESTIGATIONS_API_VERSION,
        query: {
          status: 'open',
          page: 1,
          per_page: 1,
          sort_field: 'updated_at',
          sort_order: 'desc',
        },
        signal,
      });
      return response.pagination.total > 0;
    },
    staleTime: SPACE_OPEN_INVESTIGATIONS_STALE_TIME_MS,
  });

  // A running investigation starts at medium and its severity can still change, so it is not
  // counted under a tier until it finishes — same as the sections below. Open-only so tiles,
  // section lists, and the hero "needs you" / status dot stay aligned.
  const severityCountsQuery = useQuery({
    queryKey: [
      ...NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY,
      'severityCounts',
      query,
      updatedAfter,
      updatedBefore,
    ],
    enabled: agenticInvestigations != null,
    queryFn: ({ signal }) =>
      http.get<InvestigationSeverityCounts>(SHARED_INVESTIGATIONS_SEVERITY_COUNTS_URL, {
        version: SHARED_INVESTIGATIONS_API_VERSION,
        query: {
          in_progress: false,
          status: 'open',
          ...(query ? { query } : {}),
          ...severityCountsTimeQuery,
        },
        signal,
      }),
    keepPreviousData: true,
  });

  // Same window as the filtered counts, but without search — only needed while a query is active.
  // Key uses a separate family (`severityCountsBaseline`) so a search for the literal text
  // "unfiltered" cannot collide with the filtered `severityCounts` + query slot.
  const unfilteredSeverityCountsQuery = useQuery({
    queryKey: [
      ...NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY,
      'severityCountsBaseline',
      updatedAfter,
      updatedBefore,
    ],
    enabled: agenticInvestigations != null && hasSearchQuery,
    queryFn: ({ signal }) =>
      http.get<InvestigationSeverityCounts>(SHARED_INVESTIGATIONS_SEVERITY_COUNTS_URL, {
        version: SHARED_INVESTIGATIONS_API_VERSION,
        query: {
          in_progress: false,
          status: 'open',
          ...severityCountsTimeQuery,
        },
        signal,
      }),
    keepPreviousData: true,
  });

  const { refetch: refetchCritical } = critical;
  const { refetch: refetchHigh } = high;
  const { refetch: refetchMedium } = medium;
  const { refetch: refetchLow } = low;
  const { refetch: refetchNotRated } = notRated;
  const { refetch: refetchSeverityCounts } = severityCountsQuery;
  const { refetch: refetchUnfilteredSeverityCounts } = unfilteredSeverityCountsQuery;

  // An investigation leaving the in-progress section landed in one of the others, so the rest are
  // stale the moment one finishes. Two signals are needed to see that: a loaded id disappearing
  // catches one finishing while another starts in the same tick, which leaves the total flat; a
  // shrinking total catches one finishing past the loaded window, where the loaded ids never move.
  const inProgressInvestigations = inProgress.investigations;
  const previousInProgress = useRef({
    query: filterKey,
    total: inProgress.matchTotal,
    ids: toInvestigationIds(inProgressInvestigations),
  });

  useEffect(() => {
    if (inProgress.isPreviousData) {
      return;
    }

    const ids = toInvestigationIds(inProgressInvestigations);
    const previous = previousInProgress.current;
    previousInProgress.current = { query: filterKey, total: inProgress.matchTotal, ids };

    if (previous.query !== filterKey) {
      return;
    }

    const hasFinished =
      inProgress.matchTotal < previous.total || [...previous.ids].some((id) => !ids.has(id));

    if (!hasFinished) {
      return;
    }

    refetchCritical();
    refetchHigh();
    refetchMedium();
    refetchLow();
    refetchNotRated();
    void refetchSeverityCounts();
    if (hasSearchQuery) {
      void refetchUnfilteredSeverityCounts();
    }
  }, [
    filterKey,
    hasSearchQuery,
    inProgress.matchTotal,
    inProgress.isPreviousData,
    inProgressInvestigations,
    refetchCritical,
    refetchHigh,
    refetchMedium,
    refetchLow,
    refetchNotRated,
    refetchSeverityCounts,
    refetchUnfilteredSeverityCounts,
  ]);

  const sections = useMemo(
    () => [
      toSectionState({ id: 'in-progress', queryResult: inProgress }),
      toSectionState({ id: 'critical', queryResult: critical }),
      toSectionState({ id: 'high', queryResult: high }),
      toSectionState({ id: 'medium', queryResult: medium }),
      toSectionState({ id: 'low', queryResult: low }),
      toSectionState({ id: 'not-rated', queryResult: notRated }),
    ],
    [inProgress, critical, high, medium, low, notRated]
  );

  const severityCounts = useMemo(
    () => toSeverityCounts(severityCountsQuery.data),
    [severityCountsQuery.data]
  );

  const unfilteredSeverityCounts = useMemo(() => {
    if (!hasSearchQuery) {
      return severityCounts;
    }
    if (unfilteredSeverityCountsQuery.data != null) {
      return toSeverityCounts(unfilteredSeverityCountsQuery.data);
    }
    // Baseline still missing or failed: never invent four zeros as "never present" — that would
    // hollow every tile, including tiers with positive filtered counts. Fall back to filtered
    // counts so visible tiers stay present; filtered-to-zero tiers may look muted until baseline
    // recovers.
    return severityCounts;
  }, [hasSearchQuery, severityCounts, unfilteredSeverityCountsQuery.data]);

  const { refetch: refetchSpaceOpenInvestigations } = spaceOpenInvestigationsQuery;

  const refetchAll = useCallback(() => {
    for (const section of sections) {
      section.refetch();
    }
    void refetchSeverityCounts();
    if (hasSearchQuery) {
      void refetchUnfilteredSeverityCounts();
    }
    void refetchSpaceOpenInvestigations();
  }, [
    sections,
    refetchSeverityCounts,
    hasSearchQuery,
    refetchUnfilteredSeverityCounts,
    refetchSpaceOpenInvestigations,
  ]);

  // Status toggles in the investigation flyout run on an isolated QueryClient, so closing a
  // finished investigation would not invalidate this page's open-only lists/counts otherwise.
  useStatusSignal(refetchAll);

  return {
    sections,
    severityCounts,
    unfilteredSeverityCounts,
    areSeverityCountsLoading: severityCountsQuery.isInitialLoading,
    areUnfilteredSeverityCountsLoading:
      hasSearchQuery && unfilteredSeverityCountsQuery.isInitialLoading,
    areSeverityCountsStale: severityCountsQuery.isPreviousData,
    hasSeverityCountsError: severityCountsQuery.isError,
    hasActiveInvestigations,
    activeInvestigationCount,
    hasOpenInvestigationsInSpace: spaceOpenInvestigationsQuery.data === true,
    areSpaceInvestigationsLoading: spaceOpenInvestigationsQuery.isInitialLoading,
    isInitialLoading: sections.some((section) => section.isInitialLoading),
    isFetching: sections.some((section) => section.isFetching),
    totalCount: sections.reduce((sum, section) => sum + section.total, 0),
    loadedCount: sections.reduce((sum, section) => sum + section.investigations.length, 0),
    refetchAll,
  };
};
