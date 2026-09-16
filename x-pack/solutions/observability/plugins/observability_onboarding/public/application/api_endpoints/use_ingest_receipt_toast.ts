/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useEffect, useMemo, useRef, useState } from 'react';
import useInterval from 'react-use/lib/useInterval';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { useKibana } from '../../hooks/use_kibana';
import { callObservabilityOnboardingApi } from '../../services/rest/create_call_api';
import { ApiEndpointId } from '../../../common/api_endpoints';
import { IS_INGEST_RECEIPTS_ENABLED } from '../../../common/feature_flags';
import { API_ENDPOINTS } from './endpoints_config';

const POLL_INTERVAL_MS = 5_000;
const POLL_DURATION_MS = 30 * 60 * 1_000;

// Vendor endpoints are ingested through the managed collector under its own key, so they
// never produce a receipt for the key created here.
const VERIFIABLE_ENDPOINT_IDS = [
  ApiEndpointId.Prometheus,
  ApiEndpointId.OpenTelemetry,
  ApiEndpointId.Elasticsearch,
] as const;

type VerifiableEndpointId = (typeof VERIFIABLE_ENDPOINT_IDS)[number];

// Creating a second key for an endpoint replaces the first one, so polling is tracked per
// endpoint and key rather than per endpoint. A replacement key gets its own window.
type PollSessionId = `${VerifiableEndpointId}:${string}`;

const toPollSessionId = (endpointId: VerifiableEndpointId, apiKeyId: string): PollSessionId =>
  `${endpointId}:${apiKeyId}`;

const ENDPOINT_LABELS: Partial<Record<ApiEndpointId, string>> = Object.fromEntries(
  API_ENDPOINTS.map(({ id, label }) => [id, label])
);

export function useIngestReceiptToast(apiKeyIds: Partial<Record<ApiEndpointId, string>>): void {
  const {
    services: { notifications, featureFlags },
  } = useKibana();
  const isEnabled = featureFlags.getBooleanValue(IS_INGEST_RECEIPTS_ENABLED, false);
  const startedAtRef = useRef<Partial<Record<PollSessionId, number>>>({});
  const inFlightRef = useRef<Partial<Record<PollSessionId, boolean>>>({});
  const abortControllersRef = useRef<Partial<Record<PollSessionId, AbortController>>>({});
  const apiKeyIdsRef = useRef(apiKeyIds);
  apiKeyIdsRef.current = apiKeyIds;
  const [settledSessionIds, setSettledSessionIds] = useState<
    Partial<Record<PollSessionId, boolean>>
  >({});

  const currentSessions = useMemo(
    () =>
      VERIFIABLE_ENDPOINT_IDS.flatMap((endpointId) => {
        const apiKeyId = apiKeyIds[endpointId];
        return apiKeyId
          ? [{ endpointId, apiKeyId, sessionId: toPollSessionId(endpointId, apiKeyId) }]
          : [];
      }),
    [apiKeyIds]
  );

  // A replaced key must not toast for the key the page no longer shows, so its in flight
  // request is aborted as soon as the replacement arrives.
  useEffect(() => {
    const currentSessionIds = new Set<string>(currentSessions.map(({ sessionId }) => sessionId));
    Object.entries(abortControllersRef.current).forEach(([sessionId, controller]) => {
      if (!currentSessionIds.has(sessionId)) {
        controller?.abort();
        delete abortControllersRef.current[sessionId as PollSessionId];
      }
    });
  }, [currentSessions]);

  // A response that lands after the page is gone must not raise a toast over whatever the
  // user navigated to.
  useEffect(
    () => () => {
      Object.values(abortControllersRef.current).forEach((controller) => controller?.abort());
    },
    []
  );

  const pendingSessions = isEnabled
    ? currentSessions.filter(({ sessionId }) => !settledSessionIds[sessionId])
    : [];

  const settle = (sessionId: PollSessionId) =>
    setSettledSessionIds((previous) => ({ ...previous, [sessionId]: true }));

  const verify = async (endpointId: VerifiableEndpointId, apiKeyId: string) => {
    const sessionId = toPollSessionId(endpointId, apiKeyId);
    const startedAt = (startedAtRef.current[sessionId] ??= Date.now());
    if (Date.now() - startedAt > POLL_DURATION_MS) {
      settle(sessionId);
      return;
    }
    if (inFlightRef.current[sessionId]) {
      return;
    }
    inFlightRef.current[sessionId] = true;
    const controller = (abortControllersRef.current[sessionId] ??= new AbortController());
    try {
      const { received } = await callObservabilityOnboardingApi(
        'GET /internal/observability_onboarding/api_endpoints/verification',
        { signal: controller.signal, params: { query: { apiKeyId, endpointId } } }
      );
      // The answer can still land after the key changed, in a slow browser and in tests that ignore the signal.
      if (!received || apiKeyIdsRef.current[endpointId] !== apiKeyId) {
        return;
      }
      settle(sessionId);
      notifications?.toasts.addSuccess({
        title: i18n.translate(
          'xpack.observability_onboarding.apiEndpoints.ingestReceipt.dataReceivingTitle',
          { defaultMessage: 'We are receiving your data' }
        ),
        text: i18n.translate(
          'xpack.observability_onboarding.apiEndpoints.ingestReceipt.dataReceivingDescription',
          {
            defaultMessage:
              'The {endpoint} endpoint accepted a request with the API key you created.',
            values: { endpoint: ENDPOINT_LABELS[endpointId] ?? endpointId },
          }
        ),
      });
    } catch (error) {
      // A revoked or foreign key can never report a receipt, anything else may be transient.
      if ((error as IHttpFetchError<ResponseErrorBody>).response?.status === 404) {
        settle(sessionId);
      }
    } finally {
      inFlightRef.current[sessionId] = false;
    }
  };

  useInterval(
    () => {
      pendingSessions.forEach(({ endpointId, apiKeyId }) => {
        void verify(endpointId, apiKeyId);
      });
    },
    pendingSessions.length > 0 ? POLL_INTERVAL_MS : null
  );
}
