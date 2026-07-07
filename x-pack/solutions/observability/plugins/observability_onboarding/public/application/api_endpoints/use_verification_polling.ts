/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useEffect } from 'react';
import type { ApiEndpointId } from '../../../common/api_endpoints';
import { useKibana } from '../../hooks/use_kibana';
import { callObservabilityOnboardingApi } from '../../services/rest/create_call_api';

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 100;

export interface VerificationUpdate {
  status: 'waiting' | 'accepted' | 'expired';
  signal?: string;
  lastSeen?: string;
}

export interface UseVerificationPollingParams {
  endpointId: ApiEndpointId;
  verificationId?: string;
  status?: 'waiting' | 'accepted' | 'expired';
  detectionActive?: boolean;
  endpointLabel: string;
  onStatus: (endpointId: ApiEndpointId, update: VerificationUpdate) => void;
}

export function useVerificationPolling({
  endpointId,
  verificationId,
  status,
  detectionActive,
  endpointLabel,
  onStatus,
}: UseVerificationPollingParams): void {
  const {
    services: { notifications },
  } = useKibana();

  useEffect(() => {
    if (!verificationId || status !== 'waiting' || !detectionActive) {
      return;
    }

    let pollCount = 0;
    let stopped = false;

    const stopPolling = (intervalId: ReturnType<typeof setInterval>) => {
      if (stopped) {
        return;
      }
      stopped = true;
      clearInterval(intervalId);
    };

    const intervalId = setInterval(async () => {
      if (stopped) {
        return;
      }

      pollCount += 1;
      if (pollCount > MAX_POLLS) {
        stopPolling(intervalId);
        onStatus(endpointId, { status: 'expired' });
        return;
      }

      try {
        const response = await callObservabilityOnboardingApi(
          'GET /internal/observability_onboarding/api_endpoints/verification/{verificationId}',
          { signal: null, params: { path: { verificationId } } }
        );

        if (stopped || response.status === 'waiting') {
          return;
        }

        stopPolling(intervalId);
        onStatus(endpointId, {
          status: response.status,
          signal: response.signal,
          lastSeen: response.lastSeen,
        });

        if (response.status === 'accepted') {
          notifications?.toasts.addSuccess({
            title: i18n.translate(
              'xpack.observability_onboarding.apiEndpoints.verification.acceptedToast',
              {
                defaultMessage: 'Data accepted by the {endpointLabel} endpoint.',
                values: { endpointLabel },
              }
            ),
          });
        }
      } catch {
        // Best-effort polling; ignore transient errors.
      }
    }, POLL_INTERVAL_MS);

    return () => {
      stopPolling(intervalId);
    };
  }, [detectionActive, endpointId, endpointLabel, notifications, onStatus, status, verificationId]);
}
