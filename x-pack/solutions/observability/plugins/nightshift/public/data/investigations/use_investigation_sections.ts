/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useStatusSignal } from '@kbn/agentic-investigations-plugin/public';
import type { Severity, SeverityCounts } from '@kbn/nightshift-investigations-plugin/common';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { SEVERITY_OPTIONS } from '@kbn/significant-events-schema';
import { matchesInvestigationUpdatedAtRange } from './investigation_time_range';
import {
  useFetchInvestigations,
  type FetchInvestigationsResult,
} from './use_fetch_investigations';

/** Extra rows so Home's time picker can filter client-side (same idea as Investigations). */
const HOME_SECTION_PAGE_SIZE = 50;

/**
 * Only the in-progress section polls. It is the one section that changes on its own, and the
 * only one shallow enough to refetch cheaply — a refetch re-requests every loaded page, so
 * polling a section the user has paged through multiplies requests per tick. The others are
 * refetched on the edge where work leaves this section instead.
 */
const IN_PROGRESS_REFETCH_INTERVAL_MS = 5_000;

/** Recent re-checks the 10-minute window so finished work ages out without a full page reload. */
const RECENT_REFETCH_INTERVAL_MS = 30_000;

/** How far back "Recent" looks for investigations that just left In progress. */
export const RECENT_INVESTIGATION_WINDOW_MS = 10 * 60 * 1000;

/** Candidate window for Recent: newest-by-update, shallow enough to poll with the section. */
const RECENT_CANDIDATES = 20;

/**
 * `recent` overlays open investigations opened (`created_at`) in the last
 * {@link RECENT_INVESTIGATION_WINDOW_MS}. Closed never appear here; in-progress ones stay in
 * In progress only. Open items may still also appear in their severity bucket.
 * `not-rated` holds open investigations with no severity. `closed` holds closed ones.
 * Home lists only investigations last-updated in the page time range.
 */
export type InvestigationSectionId =
  | 'recent'
  | 'in-progress'
  | Severity
  | 'not-rated'
  | 'closed';

export interface InvestigationSectionState extends FetchInvestigationsResult {
  id: InvestigationSectionId;
}

export interface InvestigationSectionsResult {
  sections: InvestigationSectionState[];
  /**
   * Open severity totals after Home filters (search, time range) — same numbers the severity
   * sections return, so the overview tiles stay in sync with the list.
   */
  severityCounts: SeverityCounts;
  /** True while any open severity tier is still on its first load. */
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

const openTierSection = (severity: Severity) => ({
  inProgress: false as const,
  severities: [severity],
  status: 'open' as const,
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

const filterSectionForHome = ({
  id,
  queryResult,
  now,
  rangeFrom,
  rangeTo,
}: {
  id: InvestigationSectionId;
  queryResult: FetchInvestigationsResult;
  now: number;
  rangeFrom: string;
  rangeTo: string;
}): FetchInvestigationsResult => {
  const inTimeRange = (investigation: InvestigationSummary) =>
    matchesInvestigationUpdatedAtRange(investigation, rangeFrom, rangeTo);

  if (id === 'recent') {
    // Opened in the last 10 minutes only — never closed.
    const investigations = queryResult.investigations.filter(
      (investigation) => isRecentInvestigation(investigation, now) && inTimeRange(investigation)
    );
    return {
      ...queryResult,
      investigations,
      total: investigations.length,
      hasMore: false,
    };
  }
  const investigations = queryResult.investigations.filter(inTimeRange);
  const hiddenLoaded = queryResult.investigations.length - investigations.length;
  return {
    ...queryResult,
    investigations,
    total: Math.max(0, queryResult.total - hiddenLoaded),
    hasMore: queryResult.hasMore && investigations.length > 0,
  };
};

export const useInvestigationSections = ({
  query,
  rangeFrom,
  rangeTo,
}: {
  query?: string;
  rangeFrom: string;
  rangeTo: string;
}): InvestigationSectionsResult => {
  const recent = useFetchInvestigations({
    inProgress: false,
    status: 'open',
    query,
    sortField: 'created_at',
    perPage: RECENT_CANDIDATES,
    refetchInterval: RECENT_REFETCH_INTERVAL_MS,
  });

  const inProgress = useFetchInvestigations({
    inProgress: true,
    status: 'open',
    query,
    refetchInterval: IN_PROGRESS_REFETCH_INTERVAL_MS,
  });

  // Every item in the in-progress section is being worked on by construction.
  const hasActiveInvestigations = inProgress.total > 0;

  const critical = useFetchInvestigations({
    ...openTierSection('critical'),
    query,
    perPage: HOME_SECTION_PAGE_SIZE,
  });
  const high = useFetchInvestigations({
    ...openTierSection('high'),
    query,
    perPage: HOME_SECTION_PAGE_SIZE,
  });
  const medium = useFetchInvestigations({
    ...openTierSection('medium'),
    query,
    perPage: HOME_SECTION_PAGE_SIZE,
  });
  const low = useFetchInvestigations({
    ...openTierSection('low'),
    query,
    perPage: HOME_SECTION_PAGE_SIZE,
  });
  const notRated = useFetchInvestigations({
    inProgress: false,
    severities: ['none'],
    status: 'open',
    query,
    perPage: HOME_SECTION_PAGE_SIZE,
  });
  const closed = useFetchInvestigations({
    inProgress: false,
    status: 'closed',
    query,
    perPage: HOME_SECTION_PAGE_SIZE,
  });

  const { refetch: refetchRecent } = recent;
  const { refetch: refetchCritical } = critical;
  const { refetch: refetchHigh } = high;
  const { refetch: refetchMedium } = medium;
  const { refetch: refetchLow } = low;
  const { refetch: refetchNotRated } = notRated;
  const { refetch: refetchClosed } = closed;

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
    refetchClosed();
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
    refetchClosed,
  ]);

  const sections = useMemo(
    () => {
      const now = Date.now();
      return (
        [
          ['recent', recent],
          ['in-progress', inProgress],
          ['critical', critical],
          ['high', high],
          ['medium', medium],
          ['low', low],
          ['not-rated', notRated],
          ['closed', closed],
        ] as const
      ).map(([id, queryResult]) =>
        toSectionState({
          id,
          queryResult: filterSectionForHome({
            id,
            queryResult,
            now,
            rangeFrom,
            rangeTo,
          }),
        })
      );
    },
    [
      recent,
      inProgress,
      critical,
      high,
      medium,
      low,
      notRated,
      closed,
      rangeFrom,
      rangeTo,
    ]
  );

  // Tile counts track the filtered open tiers — not a separate unfiltered totals API — so a
  // narrow time range that empties the list also zeroes the cards.
  const severityCounts = useMemo(() => {
    const totalFor = (severity: Severity) =>
      sections.find((section) => section.id === severity)?.total ?? 0;
    return Object.fromEntries(
      SEVERITY_OPTIONS.map((severity) => [severity, totalFor(severity)])
    ) as SeverityCounts;
  }, [sections]);

  const areSeverityCountsLoading = useMemo(
    () =>
      SEVERITY_OPTIONS.some(
        (severity) =>
          sections.find((section) => section.id === severity)?.isInitialLoading ?? false
      ),
    [sections]
  );

  const refetchAll = useCallback(() => {
    for (const section of sections) {
      section.refetch();
    }
  }, [sections]);

  // Status changes happen in the flyout's QueryClient; bump moves open ↔ Closed on this list.
  useStatusSignal(refetchAll);

  return {
    sections,
    severityCounts,
    areSeverityCountsLoading,
    hasActiveInvestigations,
    isInitialLoading: sections.some((section) => section.isInitialLoading),
    isFetching: sections.some((section) => section.isFetching),
    totalCount: sections
      .filter((section) => section.id !== 'recent')
      .reduce((sum, section) => sum + section.total, 0),
    loadedCount: sections
      .filter((section) => section.id !== 'recent')
      .reduce((sum, section) => sum + section.investigations.length, 0),
    refetchAll,
  };
};
