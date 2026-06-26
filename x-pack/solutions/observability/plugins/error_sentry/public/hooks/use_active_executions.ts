/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useQuery } from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core/public';

interface ActiveExecutionsResponse {
  hasActiveExecutions: boolean;
  hasActiveIntrospectExecutions: boolean;
  introspectJustCompleted: boolean;
}

export const useActiveExecutions = (
  http: HttpSetup,
  isPolling: boolean,
  isPollingIntrospect: boolean
) => {
  const sinceRef = useRef<string | null>(null);
  const introspectSinceRef = useRef<string | null>(null);

  useEffect(() => {
    if (isPolling && sinceRef.current === null) {
      sinceRef.current = new Date().toISOString();
    } else if (!isPolling) {
      sinceRef.current = null;
    }
  }, [isPolling]);

  useEffect(() => {
    if (isPollingIntrospect && introspectSinceRef.current === null) {
      introspectSinceRef.current = new Date().toISOString();
    } else if (!isPollingIntrospect) {
      introspectSinceRef.current = null;
    }
  }, [isPollingIntrospect]);

  const enabled = isPolling || isPollingIntrospect;

  const { data } = useQuery(
    ['errorSentry', 'activeExecutions'],
    ({ signal }) =>
      http.get<ActiveExecutionsResponse>('/internal/error_sentry/active_executions', {
        query: {
          since: sinceRef.current ?? new Date().toISOString(),
          ...(introspectSinceRef.current ? { introspectSince: introspectSinceRef.current } : {}),
        },
        signal,
      }),
    { enabled, refetchInterval: enabled ? 3000 : false }
  );

  return {
    hasActiveExecutions: isPolling ? (data?.hasActiveExecutions ?? false) : false,
    hasActiveIntrospectExecutions: isPollingIntrospect
      ? (data?.hasActiveIntrospectExecutions ?? false)
      : false,
    introspectJustCompleted: isPollingIntrospect
      ? (data?.introspectJustCompleted ?? false)
      : false,
  };
};
