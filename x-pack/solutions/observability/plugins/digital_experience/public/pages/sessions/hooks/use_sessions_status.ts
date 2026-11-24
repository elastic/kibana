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
  /** Sets sessions up, again or back on, with the current user's access. */
  enable: () => Promise<void>;
  enabling: boolean;
  enableError: Error | undefined;
  /** Turns sessions off, keeping the summaries built so far. */
  disable: () => Promise<void>;
  disabling: boolean;
  disableError: Error | undefined;
}

/** A status, and how many changes (enables and disables) had finished when it was requested. */
interface Versioned {
  status: SessionsStatus;
  changes: number;
}

/**
 * Whether sessions are set up and healthy, and a way to set them up. Sets them up by itself, once,
 * when the status says the current user can, and checks back while they rebuild.
 */
export const useSessionsStatusState = (): SessionsStatusState => {
  const apiClient = useApiClient();
  const finishedChanges = useRef(0);
  const [changed, setChanged] = useState<Versioned>();
  const [enabling, setEnabling] = useState(false);
  const [enableError, setEnableError] = useState<Error>();
  const [disabling, setDisabling] = useState(false);
  const [disableError, setDisableError] = useState<Error>();

  const {
    value: fetched,
    loading,
    error,
    refresh,
  } = useAbortableAsync(
    async ({ signal }): Promise<Versioned> => {
      const changes = finishedChanges.current;
      return {
        status: await apiClient.fetch('GET /internal/digital_experience/sessions/status', {
          signal,
        }),
        changes,
      };
    },
    [apiClient]
  );

  const change = useCallback(
    async (
      endpoint:
        | 'POST /internal/digital_experience/sessions/enable'
        | 'POST /internal/digital_experience/sessions/disable',
      setPending: (pending: boolean) => void,
      setError: (changeError: Error | undefined) => void
    ) => {
      setPending(true);
      setError(undefined);
      try {
        const status = await apiClient.fetch(endpoint, {});
        finishedChanges.current += 1;
        setChanged({ status, changes: finishedChanges.current });
      } catch (e) {
        setError(e);
      } finally {
        setPending(false);
      }
    },
    [apiClient]
  );
  const enable = useCallback(
    () => change('POST /internal/digital_experience/sessions/enable', setEnabling, setEnableError),
    [change]
  );
  const disable = useCallback(
    () =>
      change('POST /internal/digital_experience/sessions/disable', setDisabling, setDisableError),
    [change]
  );

  // What a change answered with stays until a status requested after it arrives, so a poll or
  // refresh that started before the change finished doesn't bring back the status from before.
  const status =
    changed && (!fetched || fetched.changes < changed.changes) ? changed.status : fetched?.status;

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
    disable,
    disabling,
    disableError,
  };
};
