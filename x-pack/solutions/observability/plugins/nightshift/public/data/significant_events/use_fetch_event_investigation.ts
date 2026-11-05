/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

/** How long to wait for a just-started investigation to be listed, as the alerts UI does. */
const PENDING_START_TIMEOUT_MS = 60_000;

/** More than a handful of investigations of one episode is not read: the newest open one wins. */
const EVENT_INVESTIGATIONS_PAGE_SIZE = 10;

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
  { awaiting }: { awaiting?: { id: string; startedAt: number } } = {}
): { investigation: InvestigationSummary | undefined } => {
  const { http, agenticInvestigations } = useKibana().services;

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
    // A start returns before the investigation exists, so keep asking, for a while, until the
    // new one is listed.
    refetchInterval: (response) => {
      const isAwaitingStart =
        awaiting !== undefined &&
        Date.now() - awaiting.startedAt < PENDING_START_TIMEOUT_MS &&
        !response?.results.some(({ id }) => id === awaiting.id);
      return isAwaitingStart || response?.results.some(({ in_progress: inProgress }) => inProgress)
        ? IN_PROGRESS_REFETCH_INTERVAL_MS
        : false;
    },
  });

  return { investigation: pickEventInvestigation(data?.results) };
};
