/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useKibana } from './use_kibana';

interface WiredStreamsStatus {
  enabled: boolean | 'conflict';
  can_manage: boolean;
}

export interface UseWiredStreamsStatusResult {
  isEnabled: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function useWiredStreamsStatus(): UseWiredStreamsStatusResult {
  const {
    services: { http },
  } = useKibana();

  const [status, setStatus] = useState<{
    isEnabled: boolean;
    isLoading: boolean;
    error: Error | null;
  }>({
    isEnabled: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStatus() {
      try {
        const response = await http.get<WiredStreamsStatus>('/api/streams/_status', {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setStatus({
            isEnabled: response?.enabled === true,
            isLoading: false,
            error: null,
          });
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          if (err.response?.status === 404) {
            setStatus({
              isEnabled: false,
              isLoading: false,
              error: null,
            });
          } else {
            setStatus({
              isEnabled: false,
              isLoading: false,
              error: err,
            });
          }
        }
      }
    }

    fetchStatus();

    return () => {
      controller.abort();
    };
  }, [http]);

  return status;
}
