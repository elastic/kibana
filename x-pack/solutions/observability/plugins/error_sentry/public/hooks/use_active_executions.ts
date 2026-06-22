/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useQuery } from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core/public';

export const useActiveExecutions = (http: HttpSetup, isPolling: boolean) => {
  // Capture the ISO timestamp at the moment polling starts so the server
  // only checks for executions that began after Run Now was clicked.
  const sinceRef = useRef<string | null>(null);
  useEffect(() => {
    if (isPolling && sinceRef.current === null) {
      sinceRef.current = new Date().toISOString();
    } else if (!isPolling) {
      sinceRef.current = null;
    }
  }, [isPolling]);

  const { data } = useQuery(
    ['errorSentry', 'activeExecutions'],
    ({ signal }) =>
      http.get<{ hasActiveExecutions: boolean }>('/internal/error_sentry/active_executions', {
        query: { since: sinceRef.current ?? new Date().toISOString() },
        signal,
      }),
    { enabled: isPolling, refetchInterval: isPolling ? 3000 : false }
  );

  // Return false when not polling so callers don't stay stuck on the last stale value.
  return isPolling ? (data?.hasActiveExecutions ?? false) : false;
};
