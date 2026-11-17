/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import { useAbortableAsync } from '@kbn/react-hooks';
import type { SessionsStatus } from '../../../../common/sessions';
import { useApiClient } from '../../../hooks/use_api_client';

export interface SessionsStatusState {
  status: SessionsStatus | undefined;
  loading: boolean;
  error: Error | undefined;
  refresh: () => void;
  /** Installs or updates the sessions transforms with the current user's access. */
  enable: () => Promise<void>;
  enabling: boolean;
  enableError: Error | undefined;
}

/** A status, and how many enables had finished when it was requested. */
interface Versioned {
  status: SessionsStatus;
  enables: number;
}

/** Whether sessions are set up and healthy, and a way to set them up. */
export const useSessionsStatus = (): SessionsStatusState => {
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
