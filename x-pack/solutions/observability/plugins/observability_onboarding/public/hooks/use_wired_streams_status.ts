/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from './use_kibana';

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
    services: { streams, notifications, analytics },
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
    if (!streams) {
      setStatus({
        isEnabled: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await streams.getWiredStatus();

      if (!controller.signal.aborted) {
        setStatus({
          isEnabled: response?.['logs.otel'] === true && response?.['logs.ecs'] === true,
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setStatus({
          isEnabled: false,
          isLoading: false,
          error: err,
        });
      }
    }
  }, [streams]);

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
      if (!streams) {
        return false;
      }

      if (status.isEnabled) {
        return true;
      }

      setIsEnabling(true);
      const controller = new AbortController();

      try {
        await streams.enableWiredMode(controller.signal);

        analytics?.reportEvent('observability_onboarding_wired_streams_auto_enabled', {
          flow_type: flowType,
          success: true,
        });

        await fetchStatus();

        return true;
      } catch (error) {
        const httpError = error as { body?: { message?: string }; message?: string };
        const errorMessage =
          httpError?.body?.message ||
          httpError?.message ||
          i18n.translate('xpack.observability_onboarding.wiredStreams.enableError.fallback', {
            defaultMessage: 'An unexpected error occurred.',
          });

        analytics?.reportEvent('observability_onboarding_wired_streams_auto_enabled', {
          flow_type: flowType,
          success: false,
          error_message: errorMessage,
        });

        notifications?.toasts.addError(error as Error, {
          title: i18n.translate('xpack.observability_onboarding.wiredStreams.enableError.title', {
            defaultMessage: 'Failed to enable Wired Streams',
          }),
          toastMessage: errorMessage,
        });

        return false;
      } finally {
        setIsEnabling(false);
      }
    },
    [streams, analytics, notifications, status.isEnabled, fetchStatus]
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
