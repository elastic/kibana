/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAbortableAsync } from '@kbn/react-hooks';
import type { SessionsStatus } from '../../../../common/sessions';
import { useApiClient } from '../../../hooks/use_api_client';

/** How often the status is checked again while sessions rebuild in the background. */
export const STATUS_REFRESH_MS = 30_000;

export interface SessionsStatusState {
  status: SessionsStatus | undefined;
  loading: boolean;
  error: Error | undefined;
  refresh: () => void;
  /** Sets sessions up, or again, with the current user's access. */
  enable: () => Promise<void>;
  enabling: boolean;
  enableError: Error | undefined;
}

/** A status, and how many enables had finished when it was requested. */
interface Versioned {
  status: SessionsStatus;
  enables: number;
}

/**
 * Whether sessions are set up and healthy, and a way to set them up. Sets them up by itself, once,
 * when the status says the current user can, and checks back while they rebuild.
 */
export const useSessionsStatusState = (): SessionsStatusState => {
  const apiClient = useApiClient();
  const finishedEnables = useRef(0);
  const [enabled, setEnabled] = useState<Versioned>();
  const [enabling, setEnabling] = useState(false);
  const [enableError, setEnableError] = useState<Error>();

  const {
    value: fetched,
    loading,
    error,
    refresh,
  } = useAbortableAsync(
    async ({ signal }): Promise<Versioned> => {
      const enables = finishedEnables.current;
      return {
        status: await apiClient.fetch('GET /internal/digital_experience/sessions/status', {
          signal,
        }),
        enables,
      };
    },
    [apiClient]
  );

  const enable = useCallback(async () => {
    setEnabling(true);
    setEnableError(undefined);
    try {
      const status = await apiClient.fetch('POST /internal/digital_experience/sessions/enable', {});
      finishedEnables.current += 1;
      setEnabled({ status, enables: finishedEnables.current });
    } catch (e) {
      setEnableError(e);
    } finally {
      setEnabling(false);
    }
  }, [apiClient]);

  // What enabling answered with stays until a status requested after it arrives, so a poll or
  // refresh that started before enabling finished doesn't bring back the status from before.
  const status =
    enabled && (!fetched || fetched.enables < enabled.enables) ? enabled.status : fetched?.status;

  // A failed attempt is not retried by itself: the prompt shows why, with a button to try again.
  const autoEnabled = useRef(false);
  const autoEnable = status?.autoEnable === true;
  useEffect(() => {
    if (autoEnable && !autoEnabled.current) {
      autoEnabled.current = true;
      enable();
    }
  }, [autoEnable, enable]);

  const rebuilding = status?.rebuilding === true;
  useEffect(() => {
    if (!rebuilding) {
      return;
    }
    const interval = setInterval(refresh, STATUS_REFRESH_MS);
    return () => clearInterval(interval);
  }, [rebuilding, refresh]);

  return {
    status,
    // Nothing has been fetched before the first request starts.
    loading: loading || (!status && !error),
    error,
    refresh,
    enable,
    enabling,
    enableError,
  };
};
