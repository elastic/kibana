/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
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

/** Whether sessions are set up and healthy, and a way to set them up. */
export const useSessionsStatus = (): SessionsStatusState => {
  const apiClient = useApiClient();
  const [enabledStatus, setEnabledStatus] = useState<SessionsStatus>();
  const [enabling, setEnabling] = useState(false);
  const [enableError, setEnableError] = useState<Error>();

  const {
    value: fetchedStatus,
    loading,
    error,
    refresh,
  } = useAbortableAsync(
    ({ signal }) => apiClient.fetch('GET /internal/digital_experience/sessions/status', { signal }),
    [apiClient]
  );

  const enable = useCallback(async () => {
    setEnabling(true);
    setEnableError(undefined);
    try {
      setEnabledStatus(
        await apiClient.fetch('POST /internal/digital_experience/sessions/enable', {})
      );
    } catch (e) {
      setEnableError(e);
    } finally {
      setEnabling(false);
    }
  }, [apiClient]);

  const refreshStatus = useCallback(() => {
    setEnabledStatus(undefined);
    refresh();
  }, [refresh]);

  return {
    status: enabledStatus ?? fetchedStatus,
    // Nothing has been fetched before the first request starts.
    loading: loading || (!enabledStatus && !fetchedStatus && !error),
    error,
    refresh: refreshStatus,
    enable,
    enabling,
    enableError,
  };
};
