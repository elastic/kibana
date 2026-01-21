/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from './use_kibana';

interface WiredStreamsStatus {
  enabled: boolean | 'conflict';
  can_manage: boolean;
}

export type FlowType = 'otel_host' | 'otel_kubernetes' | 'elastic_agent_kubernetes' | 'auto_detect';

export interface UseWiredStreamsStatusResult {
  isEnabled: boolean;
  isLoading: boolean;
  isEnabling: boolean;
  error: Error | null;
  enableWiredStreams: (flowType: FlowType) => Promise<boolean>;
  refetch: () => void;
}

export function useWiredStreamsStatus(): UseWiredStreamsStatusResult {
  const {
    services: { http, notifications, analytics },
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

  const [isEnabling, setIsEnabling] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchStatus = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

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
  }, [http]);

  useEffect(() => {
    fetchStatus();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchStatus, refetchTrigger]);

  const refetch = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  const enableWiredStreams = useCallback(
    async (flowType: FlowType): Promise<boolean> => {
      if (status.isEnabled) {
        return true;
      }

      setIsEnabling(true);

      try {
        await http.post('/api/streams/_enable', {
          version: '2023-10-31',
        });

        analytics?.reportEvent('observability_onboarding_wired_streams_auto_enabled', {
          flow_type: flowType,
          success: true,
        });

        await fetchStatus();

        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        analytics?.reportEvent('observability_onboarding_wired_streams_auto_enabled', {
          flow_type: flowType,
          success: false,
          error_message: errorMessage,
        });

        notifications?.toasts.addError(error as Error, {
          title: i18n.translate(
            'xpack.observability_onboarding.wiredStreams.enableError.title',
            {
              defaultMessage: 'Failed to enable Wired Streams',
            }
          ),
          toastMessage: i18n.translate(
            'xpack.observability_onboarding.wiredStreams.enableError.message',
            {
              defaultMessage:
                'Could not enable Wired Streams. Please try again or contact your administrator.',
            }
          ),
        });

        return false;
      } finally {
        setIsEnabling(false);
      }
    },
    [http, analytics, notifications, status.isEnabled, fetchStatus]
  );

  return {
    isEnabled: status.isEnabled,
    isLoading: status.isLoading,
    isEnabling,
    error: status.error,
    enableWiredStreams,
    refetch,
  };
}
