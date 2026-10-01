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
  SEVERITY_TIER_TO_INVESTIGATION_SEVERITY,
  SHARED_INVESTIGATIONS_API_VERSION,
  SHARED_INVESTIGATIONS_SEVERITY_COUNTS_URL,
} from '../common/shared_investigations_api';
import { useKibana } from './use_kibana';
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
  hasActiveInvestigations: boolean;
  isInitialLoading: boolean;
  isFetching: boolean;
  totalCount: number;
  loadedCount: number;
  refetchAll: () => void;
}

const toInvestigationIds = (investigations: InvestigationSummary[]): Set<string> =>
  new Set(investigations.map(({ id }) => id));

const tierSection = (severity: Severity) => ({
  inProgress: false,
  severities: [SEVERITY_TIER_TO_INVESTIGATION_SEVERITY[severity]],
});

const toSeverityCounts = (counts: InvestigationSeverityCounts | undefined): SeverityCounts => ({
  '80-critical': counts?.critical ?? 0,
  '60-high': counts?.high ?? 0,
  '40-medium': counts?.medium ?? 0,
  '20-low': counts?.low ?? 0,
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
}: {
  query?: string;
} = {}): InvestigationSectionsResult => {
  const { http, agenticInvestigations } = useKibana().services;

  const inProgress = useFetchInvestigations({
    inProgress: true,
    query,
    refetchInterval: IN_PROGRESS_REFETCH_INTERVAL_MS,
  });

  // Every item in the in-progress section is being worked on by construction.
  const hasActiveInvestigations = inProgress.total > 0;

  const critical = useFetchInvestigations({ ...tierSection('80-critical'), query });
  const high = useFetchInvestigations({ ...tierSection('60-high'), query });
  const medium = useFetchInvestigations({ ...tierSection('40-medium'), query });
  const low = useFetchInvestigations({ ...tierSection('20-low'), query });
  const notRated = useFetchInvestigations({ inProgress: false, severities: ['none'], query });

  // The tiles count the same investigations as the severity sections.
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
    refetchCritical,
    refetchHigh,
    refetchMedium,
    refetchLow,
    refetchNotRated,
    refetchSeverityCounts,
  ]);

  const sections = useMemo(
    () => [
      toSectionState({ id: 'in-progress', queryResult: inProgress }),
      toSectionState({ id: '80-critical', queryResult: critical }),
      toSectionState({ id: '60-high', queryResult: high }),
      toSectionState({ id: '40-medium', queryResult: medium }),
      toSectionState({ id: '20-low', queryResult: low }),
      toSectionState({ id: 'not-rated', queryResult: notRated }),
    ],
    [inProgress, critical, high, medium, low, notRated]
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

  return {
    sections,
    severityCounts,
    hasActiveInvestigations,
    isInitialLoading: sections.some((section) => section.isInitialLoading),
    isFetching: sections.some((section) => section.isFetching),
    totalCount: sections.reduce((sum, section) => sum + section.total, 0),
    loadedCount: sections.reduce((sum, section) => sum + section.investigations.length, 0),
    refetchAll,
  };
};
