/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { SdlcSyncStatusResponse } from '../../common/api/types';
import { useSdlcApi } from '../context/sdlc_api_context';

interface SyncStatusState {
  readonly loading: boolean;
  readonly error?: string;
  readonly data?: SdlcSyncStatusResponse;
}

export const useSyncStatus = (): SyncStatusState => {
  const api = useSdlcApi();
  const [state, setState] = useState<SyncStatusState>({ loading: true });

  useEffect(() => {
    let isMounted = true;

    api
      .getSyncStatus()
      .then((data) => {
        if (isMounted) {
          setState({ loading: false, data });
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setState({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load sync status',
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [api]);

  return state;
};
