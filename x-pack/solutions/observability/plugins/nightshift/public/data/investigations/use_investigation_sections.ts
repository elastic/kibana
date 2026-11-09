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
} from '@kbn/agentic-investigations-plugin/common';
import {
  SHARED_INVESTIGATIONS_API_VERSION,
  SHARED_INVESTIGATIONS_SEVERITY_COUNTS_URL,
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

/** Recent re-checks the 10-minute window so finished work ages out without a full page reload. */
const RECENT_REFETCH_INTERVAL_MS = 30_000;

/** How far back "Recently Investigated" looks for open investigations that are not in progress. */
export const RECENT_INVESTIGATION_WINDOW_MS = 10 * 60 * 1000;

/** Candidate window for Recent: newest-by-created_at, shallow enough to poll with the section. */
const RECENT_CANDIDATES = 20;

/**
 * `recent` overlays open investigations opened (`created_at`) in the last
 * {@link RECENT_INVESTIGATION_WINDOW_MS}. In-progress ones stay in In progress only. Open items
 * may still also appear in their severity bucket.
 * `not-rated` holds the investigations nothing works on that have no severity: the agent did not
 * record one, for example because its run ended early. There is no failed state.
 */
export type InvestigationSectionId = 'recent' | 'in-progress' | Severity | 'not-rated';

export interface InvestigationSectionState extends FetchInvestigationsResult {
  id: InvestigationSectionId;
}

export interface InvestigationSectionsResult {
  sections: InvestigationSectionState[];
  severityCounts: SeverityCounts;
  /** The counts query is separate from the sections, so it settles on its own schedule. */
  areSeverityCountsLoading: boolean;
  hasActiveInvestigations: boolean;
  isInitialLoading: boolean;
  isFetching: boolean;
  /**
   * Investigations matching the current filters, each counted once across the disjoint home
   * buckets (excludes Recent, which overlaps the others).
   */
  totalCount: number;
  loadedCount: number;
  refetchAll: () => void;
}

/**
 * Open, not-in-progress investigations opened (`created_at`) within the Recent window.
 * Closed investigations are never recent, regardless of how recently they were updated.
 */
export const isRecentInvestigation = (
  investigation: InvestigationSummary,
  now = Date.now()
): boolean => {
  if (investigation.in_progress) {
    return false;
  }
  if (investigation.metadata.status === 'closed') {
    return false;
  }
  const opened = Date.parse(investigation.created_at);
  return Number.isFinite(opened) && now - opened <= RECENT_INVESTIGATION_WINDOW_MS;
};

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

const toRecentSection = (queryResult: FetchInvestigationsResult): FetchInvestigationsResult => {
  const investigations = queryResult.investigations.filter((investigation) =>
    isRecentInvestigation(investigation)
  );
  return {
    ...queryResult,
    investigations,
    total: investigations.length,
    hasMore: false,
  };
};

export const useInvestigationSections = ({
  query,
}: {
  query?: string;
} = {}): InvestigationSectionsResult => {
  const { http, agenticInvestigations } = useKibana().services;

  const recentCandidates = useFetchInvestigations({
    inProgress: false,
    status: 'open',
    query,
    perPage: RECENT_CANDIDATES,
    refetchInterval: RECENT_REFETCH_INTERVAL_MS,
  });

  const inProgress = useFetchInvestigations({
    inProgress: true,
    query,
    refetchInterval: IN_PROGRESS_REFETCH_INTERVAL_MS,
  });

  // Every item in the in-progress section is being worked on by construction.
  const hasActiveInvestigations = inProgress.total > 0;

  const critical = useFetchInvestigations({ ...tierSection('critical'), query });
  const high = useFetchInvestigations({ ...tierSection('high'), query });
  const medium = useFetchInvestigations({ ...tierSection('medium'), query });
  const low = useFetchInvestigations({ ...tierSection('low'), query });
  const notRated = useFetchInvestigations({ inProgress: false, severities: ['none'], query });

  // A running investigation starts at medium and its severity can still change, so it is not
  // counted under a tier until it finishes — same as the sections below.
  const severityCountsQuery = useQuery({
    queryKey: [...NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY, 'severityCounts', query],
    enabled: agenticInvestigations != null,
    queryFn: ({ signal }) =>
      http.get<InvestigationSeverityCounts>(SHARED_INVESTIGATIONS_SEVERITY_COUNTS_URL, {
        version: SHARED_INVESTIGATIONS_API_VERSION,
        query: { in_progress: false, ...(query ? { query } : {}) },
        signal,
      }),
    keepPreviousData: true,
  });

  const { refetch: refetchRecent } = recentCandidates;
  const { refetch: refetchCritical } = critical;
  const { refetch: refetchHigh } = high;
  const { refetch: refetchMedium } = medium;
  const { refetch: refetchLow } = low;
  const { refetch: refetchNotRated } = notRated;
  const { refetch: refetchSeverityCounts } = severityCountsQuery;

  // An investigation leaving the in-progress section landed in one of the others, so the rest are
  // stale the moment one finishes. Two signals are needed to see that: a loaded id disappearing
  // catches one finishing while another starts in the same tick, which leaves the total flat; a
  // shrinking total catches one finishing past the loaded window, where the loaded ids never move.
  const inProgressInvestigations = inProgress.investigations;
  const previousInProgress = useRef({
    query,
    total: inProgress.total,
    ids: toInvestigationIds(inProgressInvestigations),
  });

  useEffect(() => {
    if (inProgress.isPreviousData) {
      return;
    }

    const ids = toInvestigationIds(inProgressInvestigations);
    const previous = previousInProgress.current;
    previousInProgress.current = { query, total: inProgress.total, ids };

    if (previous.query !== query) {
      return;
    }

    const hasFinished =
      inProgress.total < previous.total || [...previous.ids].some((id) => !ids.has(id));

    if (!hasFinished) {
      return;
    }

    refetchRecent();
    refetchCritical();
    refetchHigh();
    refetchMedium();
    refetchLow();
    refetchNotRated();
    void refetchSeverityCounts();
  }, [
    query,
    inProgress.total,
    inProgress.isPreviousData,
    inProgressInvestigations,
    refetchRecent,
    refetchCritical,
    refetchHigh,
    refetchMedium,
    refetchLow,
    refetchNotRated,
    refetchSeverityCounts,
  ]);

  const recent = useMemo(() => toRecentSection(recentCandidates), [recentCandidates]);

  const sections = useMemo(
    () => [
      toSectionState({ id: 'recent', queryResult: recent }),
      toSectionState({ id: 'in-progress', queryResult: inProgress }),
      toSectionState({ id: 'critical', queryResult: critical }),
      toSectionState({ id: 'high', queryResult: high }),
      toSectionState({ id: 'medium', queryResult: medium }),
      toSectionState({ id: 'low', queryResult: low }),
      toSectionState({ id: 'not-rated', queryResult: notRated }),
    ],
    [recent, inProgress, critical, high, medium, low, notRated]
  );

  const severityCounts = useMemo(
    () => toSeverityCounts(severityCountsQuery.data),
    [severityCountsQuery.data]
  );

  const refetchAll = useCallback(() => {
    for (const section of sections) {
      section.refetch();
    }
    void refetchSeverityCounts();
  }, [sections, refetchSeverityCounts]);

  const countedSections = useMemo(
    () => sections.filter((section) => section.id !== 'recent'),
    [sections]
  );

  return {
    sections,
    severityCounts,
    areSeverityCountsLoading: severityCountsQuery.isInitialLoading,
    hasActiveInvestigations,
    isInitialLoading: sections.some((section) => section.isInitialLoading),
    isFetching: sections.some((section) => section.isFetching),
    totalCount: countedSections.reduce((sum, section) => sum + section.total, 0),
    loadedCount: countedSections.reduce(
      (sum, section) => sum + section.investigations.length,
      0
    ),
    refetchAll,
  };
};
