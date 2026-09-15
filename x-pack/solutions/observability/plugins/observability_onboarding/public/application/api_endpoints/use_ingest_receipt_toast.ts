/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useRef, useState } from 'react';
import useInterval from 'react-use/lib/useInterval';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { useKibana } from '../../hooks/use_kibana';
import { callObservabilityOnboardingApi } from '../../services/rest/create_call_api';
import { ApiEndpointId } from '../../../common/api_endpoints';
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

const ENDPOINT_LABELS: Partial<Record<ApiEndpointId, string>> = Object.fromEntries(
  API_ENDPOINTS.map(({ id, label }) => [id, label])
);

export function useIngestReceiptToast(apiKeyIds: Partial<Record<ApiEndpointId, string>>): void {
  const {
    services: { notifications },
  } = useKibana();
  const startedAtRef = useRef<Partial<Record<VerifiableEndpointId, number>>>({});
  const inFlightRef = useRef<Partial<Record<VerifiableEndpointId, boolean>>>({});
  const [settledEndpointIds, setSettledEndpointIds] = useState<
    Partial<Record<VerifiableEndpointId, boolean>>
  >({});

  const pendingEndpointIds = VERIFIABLE_ENDPOINT_IDS.filter(
    (endpointId) => Boolean(apiKeyIds[endpointId]) && !settledEndpointIds[endpointId]
  );

  const settle = (endpointId: VerifiableEndpointId) =>
    setSettledEndpointIds((previous) => ({ ...previous, [endpointId]: true }));

  const verify = async (endpointId: VerifiableEndpointId, apiKeyId: string) => {
    const startedAt = (startedAtRef.current[endpointId] ??= Date.now());
    if (Date.now() - startedAt > POLL_DURATION_MS) {
      settle(endpointId);
      return;
    }
    if (inFlightRef.current[endpointId]) {
      return;
    }
    inFlightRef.current[endpointId] = true;
    try {
      const { received } = await callObservabilityOnboardingApi(
        'GET /internal/observability_onboarding/api_endpoints/verification',
        { signal: null, params: { query: { apiKeyId, endpointId } } }
      );
      if (!received) {
        return;
      }
      settle(endpointId);
      notifications?.toasts.addSuccess({
        title: i18n.translate(
          'xpack.observability_onboarding.apiEndpoints.ingestReceipt.dataReceivedTitle',
          { defaultMessage: 'Data received' }
        ),
        text: i18n.translate(
          'xpack.observability_onboarding.apiEndpoints.ingestReceipt.dataReceivedDescription',
          {
            defaultMessage: '{endpoint} is receiving data with the API key you created.',
            values: { endpoint: ENDPOINT_LABELS[endpointId] ?? endpointId },
          }
        ),
      });
    } catch (error) {
      // A revoked or foreign key can never report a receipt, anything else may be transient.
      if ((error as IHttpFetchError<ResponseErrorBody>).response?.status === 404) {
        settle(endpointId);
      }
    } finally {
      inFlightRef.current[endpointId] = false;
    }
  };

  useInterval(
    () => {
      pendingEndpointIds.forEach((endpointId) => {
        const apiKeyId = apiKeyIds[endpointId];
        if (apiKeyId) {
          void verify(endpointId, apiKeyId);
        }
      });
    },
    pendingEndpointIds.length > 0 ? POLL_INTERVAL_MS : null
  );
}
