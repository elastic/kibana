/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  InvestigationStatus,
  ListInvestigationItem,
  Severity,
  SeverityCounts,
} from '@kbn/nightshift-investigations-plugin/common';
import { useFetchInvestigations, type FetchInvestigationsResult } from './use_fetch_investigations';

/**
 * Only the in-progress section polls. It is the one section that changes on its own, and the
 * only one shallow enough to refetch cheaply — a refetch re-requests every loaded page, so
 * polling a section the user has paged through multiplies requests per tick. The others are
 * refetched on the edge where work leaves this section instead.
 */
const IN_PROGRESS_REFETCH_INTERVAL_MS = 5_000;

const IN_PROGRESS_INVESTIGATION_STATUSES: InvestigationStatus[] = ['pending', 'running'];

const COMPLETED_INVESTIGATION_STATUSES: InvestigationStatus[] = ['completed'];

const FAILED_INVESTIGATION_STATUSES: InvestigationStatus[] = ['failed', 'cancelled'];

export type InvestigationSectionId = 'in-progress' | Severity | 'failed';

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

const toInvestigationIds = (investigations: ListInvestigationItem[]): Set<string> =>
  new Set(investigations.map(({ investigation_id: investigationId }) => investigationId));

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
  const inProgress = useFetchInvestigations({
    statuses: IN_PROGRESS_INVESTIGATION_STATUSES,
    query,
    refetchInterval: IN_PROGRESS_REFETCH_INTERVAL_MS,
  });

  // Every item in the in-progress section is pending or running by construction.
  const hasActiveInvestigations = inProgress.total > 0;

  const critical = useFetchInvestigations({
    statuses: COMPLETED_INVESTIGATION_STATUSES,
    severities: ['80-critical'],
    query,
  });
  const high = useFetchInvestigations({
    statuses: COMPLETED_INVESTIGATION_STATUSES,
    severities: ['60-high'],
    query,
  });
  const medium = useFetchInvestigations({
    statuses: COMPLETED_INVESTIGATION_STATUSES,
    severities: ['40-medium'],
    query,
  });
  const low = useFetchInvestigations({
    statuses: COMPLETED_INVESTIGATION_STATUSES,
    severities: ['20-low'],
    query,
  });
  const failed = useFetchInvestigations({
    statuses: FAILED_INVESTIGATION_STATUSES,
    query,
  });

  const { refetch: refetchCritical } = critical;
  const { refetch: refetchHigh } = high;
  const { refetch: refetchMedium } = medium;
  const { refetch: refetchLow } = low;
  const { refetch: refetchFailed } = failed;

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
    refetchFailed();
  }, [
    query,
    inProgress.total,
    inProgressInvestigations,
    refetchCritical,
    refetchHigh,
    refetchMedium,
    refetchLow,
    refetchFailed,
  ]);

  const sections = useMemo(
    () => [
      toSectionState({ id: 'in-progress', queryResult: inProgress }),
      toSectionState({ id: '80-critical', queryResult: critical }),
      toSectionState({ id: '60-high', queryResult: high }),
      toSectionState({ id: '40-medium', queryResult: medium }),
      toSectionState({ id: '20-low', queryResult: low }),
      toSectionState({ id: 'failed', queryResult: failed }),
    ],
    [inProgress, critical, high, medium, low, failed]
  );

  const severityCounts = useMemo(
    (): SeverityCounts => ({
      '80-critical': critical.total,
      '60-high': high.total,
      '40-medium': medium.total,
      '20-low': low.total,
    }),
    [critical.total, high.total, medium.total, low.total]
  );

  const refetchAll = useCallback(() => {
    for (const section of sections) {
      section.refetch();
    }
  }, [sections]);

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
