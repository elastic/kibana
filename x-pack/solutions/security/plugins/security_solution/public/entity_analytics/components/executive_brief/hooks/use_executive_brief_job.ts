/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@kbn/react-query';
import {
  EXECUTIVE_BRIEF_API_VERSION,
  EXECUTIVE_BRIEF_POC_JOB_URL,
  POC_POLL_INTERVAL_MS,
  POC_POLL_TIMEOUT_MS,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  BriefJobStatus,
  ExecutiveBriefJob,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { useKibana } from '../../../../common/lib/kibana';

const TERMINAL_STATUSES: readonly BriefJobStatus[] = ['succeeded', 'failed', 'canceled'];

export const isTerminalStatus = (status: BriefJobStatus | undefined): boolean =>
  status !== undefined && TERMINAL_STATUSES.includes(status);

/** Polls the job document every POC_POLL_INTERVAL_MS until it is terminal, for at most POC_POLL_TIMEOUT_MS. */
export const useExecutiveBriefJob = (jobId: string | undefined) => {
  const { http } = useKibana().services;
  const [timedOutJobId, setTimedOutJobId] = useState<string | undefined>();
  const hasTimedOut = Boolean(jobId) && timedOutJobId === jobId;

  const query = useQuery<ExecutiveBriefJob, Error>({
    queryKey: ['executive-brief', jobId],
    enabled: Boolean(jobId),
    queryFn: ({ signal }) =>
      http.fetch<ExecutiveBriefJob>(
        EXECUTIVE_BRIEF_POC_JOB_URL.replace('{id}', encodeURIComponent(jobId ?? '')),
        { version: EXECUTIVE_BRIEF_API_VERSION, signal }
      ),
    refetchOnWindowFocus: false,
    refetchInterval: (data) =>
      isTerminalStatus(data?.status) || hasTimedOut ? false : POC_POLL_INTERVAL_MS,
  });

  const isTerminal = isTerminalStatus(query.data?.status);
  useEffect(() => {
    if (!jobId || isTerminal) return;
    const timer = setTimeout(() => setTimedOutJobId(jobId), POC_POLL_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [jobId, isTerminal]);

  return { ...query, hasTimedOut };
};
