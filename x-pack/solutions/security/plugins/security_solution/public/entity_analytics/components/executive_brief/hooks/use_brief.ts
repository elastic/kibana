/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import {
  EXECUTIVE_BRIEF_API_PATH,
  EXECUTIVE_BRIEF_API_VERSION,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  BriefJobStatus,
  BriefResponse,
} from '../../../../../common/entity_analytics/executive_brief/document';
import { useKibana } from '../../../../common/lib/kibana';

export const BRIEF_QUERY_KEY = ['entity-analytics', 'executive-brief'] as const;

/** Poll delays while a job is pending or running; the last one repeats. */
export const BRIEF_POLL_BACKOFF_MS = [1500, 3000, 5000] as const;

export const isBriefJobActive = (status: BriefJobStatus | undefined): boolean =>
  status === 'pending' || status === 'running';

/** Delay before poll number `attempt` (0-based), or false once the job has finished. */
export const getBriefPollInterval = (
  status: BriefJobStatus | undefined,
  attempt: number
): number | false => {
  if (!isBriefJobActive(status)) return false;
  return BRIEF_POLL_BACKOFF_MS[Math.min(attempt, BRIEF_POLL_BACKOFF_MS.length - 1)];
};

const isNotFound = (error: unknown): boolean =>
  (error as IHttpFetchError | undefined)?.response?.status === 404;

export interface UseBriefResult {
  /** The caller's brief document; undefined when they have none (404). */
  document: BriefResponse | undefined;
  /** True only on the first load, before anything is known. */
  isLoading: boolean;
  /** True while a job is pending or running. */
  isGenerating: boolean;
  error: Error | undefined;
  refetch: () => void;
}

/** Loads the current user's brief for this space and polls with backoff while a job runs. */
export const useBrief = (): UseBriefResult => {
  const { http } = useKibana().services;
  const pollAttempt = useRef(0);

  const query = useQuery<BriefResponse | null, Error>({
    queryKey: BRIEF_QUERY_KEY,
    queryFn: async ({ signal }) => {
      try {
        return await http.fetch<BriefResponse>(EXECUTIVE_BRIEF_API_PATH, {
          method: 'GET',
          version: EXECUTIVE_BRIEF_API_VERSION,
          signal,
        });
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const document = query.data ?? undefined;
  const status = document?.job.status;
  const { refetch, dataUpdatedAt, errorUpdatedAt } = query;

  // Each finished fetch (or failed poll) schedules the next one, so the delay can back off.
  useEffect(() => {
    const interval = getBriefPollInterval(status, pollAttempt.current);
    if (interval === false) {
      pollAttempt.current = 0;
      return;
    }
    const timer = setTimeout(() => {
      pollAttempt.current += 1;
      refetch();
    }, interval);
    return () => clearTimeout(timer);
  }, [status, dataUpdatedAt, errorUpdatedAt, refetch]);

  return {
    document,
    isLoading: query.isLoading,
    isGenerating: isBriefJobActive(document?.job.status),
    error: query.error ?? undefined,
    refetch: () => {
      refetch();
    },
  };
};
