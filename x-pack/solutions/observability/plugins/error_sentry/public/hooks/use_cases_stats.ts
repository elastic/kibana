/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core/public';

export interface CaseItem {
  id: string;
  title: string;
  status: 'open' | 'in-progress' | 'closed';
  createdAt: string;
  commentCount: number;
}

export interface CasesStats {
  total: number;
  open: number;
  inProgress: number;
  closed: number;
  recentCases: CaseItem[];
}

export const useCasesStats = (http: HttpSetup, isPolling = false) => {
  const {
    isLoading,
    data: stats,
    error,
    refetch,
  } = useQuery(
    ['errorSentry', 'casesStats'],
    ({ signal }) => http.get<CasesStats>('/internal/error_sentry/cases_stats', { signal }),
    { refetchInterval: isPolling ? 5000 : false }
  );

  return {
    isLoading,
    stats: stats ?? null,
    error: error
      ? String(
          (error as { body?: { message?: string } })?.body?.message ??
            (error instanceof Error ? error.message : error)
        )
      : null,
    refetch,
  };
};
