/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@kbn/react-query';
import type {
  InvestigationSummary,
  ListInvestigationsResponse,
} from '@kbn/agentic-investigations-plugin/common';
import {
  SHARED_INVESTIGATIONS_API_VERSION,
  SHARED_INVESTIGATIONS_URL,
} from '../investigations/shared_investigations_api';
import { NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY } from '../investigations/use_fetch_investigations';
import { useKibana } from '../../hooks/use_kibana';

const IN_PROGRESS_REFETCH_INTERVAL_MS = 5_000;

/** How long to wait for a just-started run to show, as the alerts UI does. */
const PENDING_START_TIMEOUT_MS = 60_000;

/** More than a handful of investigations of one episode is not read: the most recently updated open one wins. */
const EVENT_INVESTIGATIONS_PAGE_SIZE = 10;

/** What a start waits for: the listed investigation to carry the run it launched. */
interface AwaitedStart {
  id: string;
  startedAt: number;
  /**
   * The awaited investigation's `updated_at` before the start, when it already existed. A new
   * investigation's creating write records the run, so being listed is enough there.
   */
  listedUpdatedAt?: string;
}

/**
 * Whether the started run is still missing from the list. It shows as `in_progress` or as a moved
 * `updated_at`, since a run can finish before the first refresh.
 */
const isStartPending = (
  awaiting: AwaitedStart | undefined,
  investigations: InvestigationSummary[] | undefined
): boolean => {
  if (awaiting === undefined || Date.now() - awaiting.startedAt >= PENDING_START_TIMEOUT_MS) {
    return false;
  }
  const listed = investigations?.find(({ id }) => id === awaiting.id);
  if (listed === undefined) {
    return true;
  }
  // A follow-up reuses the id, which is listed before its run is.
  return (
    !listed.in_progress &&
    awaiting.listedUpdatedAt !== undefined &&
    listed.updated_at === awaiting.listedUpdatedAt
  );
};

/**
 * The investigation an event refers to: the open one, else the most recently updated. Mirrors
 * `pickAlertInvestigation` in the alerts UI (`use_investigate_alert.tsx`), which nightshift cannot
 * import, so an alert and its event show the same investigation.
 */
const pickEventInvestigation = (
  investigations: InvestigationSummary[] | undefined
): InvestigationSummary | undefined =>
  investigations?.find(({ metadata }) => metadata.status === 'open') ?? investigations?.[0];

/**
 * The investigation of a significant event, found the way the alerts UI finds an alert's: an
 * investigation records the event's alert as a subject (keyed by the episode id), so the shared
 * list API returns it by that id. Nothing is read from the event's own `investigations[]`.
 */
export const useFetchEventInvestigation = (
  episodeId: string | undefined,
  { awaiting }: { awaiting?: AwaitedStart } = {}
): { investigation: InvestigationSummary | undefined; isAwaitingStart: boolean } => {
  const { http, agenticInvestigations } = useKibana().services;

  // Ends on a timer, not on a fetch: if every list request fails, nothing else re-renders. Keyed by
  // `startedAt`, since a follow-up reuses the id and must start its own wait.
  const [settledStartAt, setSettledStartAt] = useState<number>();
  const awaitingStartedAt = awaiting?.startedAt;
  useEffect(() => {
    if (awaitingStartedAt === undefined) {
      return;
    }
    const timer = setTimeout(
      () => setSettledStartAt(awaitingStartedAt),
      Math.max(0, PENDING_START_TIMEOUT_MS - (Date.now() - awaitingStartedAt))
    );
    return () => clearTimeout(timer);
  }, [awaitingStartedAt]);

  const { data } = useQuery<ListInvestigationsResponse, Error>({
    queryKey: [...NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY, 'event', episodeId],
    // The list API belongs to agenticInvestigations, an optional dependency.
    enabled: agenticInvestigations != null && Boolean(episodeId),
    queryFn: ({ signal }) =>
      http.get<ListInvestigationsResponse>(SHARED_INVESTIGATIONS_URL, {
        version: SHARED_INVESTIGATIONS_API_VERSION,
        query: {
          subject_type: 'alert',
          subject_id: episodeId,
          sort_field: 'updated_at',
          sort_order: 'desc',
          per_page: EVENT_INVESTIGATIONS_PAGE_SIZE,
        },
        signal,
      }),
    retry: false,
    // A start returns before its run is observable, so keep asking, for a while, until it is.
    refetchInterval: (response) =>
      isStartPending(awaiting, response?.results) ||
      response?.results.some(({ in_progress: inProgress }) => inProgress)
        ? IN_PROGRESS_REFETCH_INTERVAL_MS
        : false,
  });

  // Once the awaited investigation carries the run, the wait is over for good: the run finishing
  // must not make the start look unobserved again.
  useEffect(() => {
    if (awaitingStartedAt !== undefined && !isStartPending(awaiting, data?.results)) {
      setSettledStartAt(awaitingStartedAt);
    }
  }, [awaiting, awaitingStartedAt, data]);

  return {
    investigation: pickEventInvestigation(data?.results),
    // A start returns before its run is observable: until then, the listed one (if any) is an older
    // run and must not read as the current one.
    isAwaitingStart:
      awaitingStartedAt !== undefined &&
      awaitingStartedAt !== settledStartAt &&
      isStartPending(awaiting, data?.results),
  };
};
