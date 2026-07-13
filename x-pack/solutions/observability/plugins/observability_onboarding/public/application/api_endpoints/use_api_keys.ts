/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useCallback, useState } from 'react';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { useKibana } from '../../hooks/use_kibana';
import { callObservabilityOnboardingApi } from '../../services/rest/create_call_api';
import type { ApiEndpointId } from '../../../common/api_endpoints';

export interface ApiEndpointKeyState {
  encodedApiKey: string;
  apiKeyId: string;
  verificationId: string;
  status: 'waiting' | 'accepted' | 'expired';
  detectionActive: boolean;
}

export interface UseApiKeysResult {
  keys: Partial<Record<ApiEndpointId, ApiEndpointKeyState>>;
  creatingEndpointId?: ApiEndpointId;
  createApiKey: (endpointId: ApiEndpointId) => Promise<void>;
  setVerification: (
    endpointId: ApiEndpointId,
    update: { status: 'waiting' | 'accepted' | 'expired'; signal?: string; lastSeen?: string }
  ) => void;
}

export function useApiKeys(): UseApiKeysResult {
  const {
    services: { notifications },
  } = useKibana();
  const [keys, setKeys] = useState<Partial<Record<ApiEndpointId, ApiEndpointKeyState>>>({});
  const [creatingEndpointId, setCreatingEndpointId] = useState<ApiEndpointId | undefined>(
    undefined
  );

  const setVerification = useCallback(
    (
      endpointId: ApiEndpointId,
      update: { status: 'waiting' | 'accepted' | 'expired'; signal?: string; lastSeen?: string }
    ) => {
      setKeys((previous) => {
        const existing = previous[endpointId];
        if (!existing) {
          return previous;
        }
        return {
          ...previous,
          [endpointId]: {
            ...existing,
            status: update.status,
          },
        };
      });
    },
    []
  );

  const createApiKey = useCallback(
    async (endpointId: ApiEndpointId) => {
      setCreatingEndpointId(endpointId);
      try {
        const { encodedApiKey, apiKeyId, verificationId, detectionActive } =
          await callObservabilityOnboardingApi(
            'POST /internal/observability_onboarding/api_endpoints/create_key/{id}',
            { signal: null, params: { path: { id: endpointId } } }
          );
        setKeys((previous) => ({
          ...previous,
          [endpointId]: {
            encodedApiKey,
            apiKeyId,
            verificationId,
            status: 'waiting',
            detectionActive,
          },
        }));
        notifications?.toasts.addSuccess({
          title: i18n.translate('xpack.observability_onboarding.apiEndpoints.createKeySuccess', {
            defaultMessage: 'API key created successfully',
          }),
        });
      } catch (error) {
        const fetchError = error as IHttpFetchError<ResponseErrorBody>;
        notifications?.toasts.addError(fetchError, {
          title: i18n.translate('xpack.observability_onboarding.apiEndpoints.createKeyError', {
            defaultMessage: 'Failed to create API key',
          }),
          toastMessage:
            fetchError.body?.message ??
            i18n.translate('xpack.observability_onboarding.apiEndpoints.createKeyErrorFallback', {
              defaultMessage:
                'Something went wrong while creating the API key. Try again or contact your administrator.',
            }),
        });
      } finally {
        setCreatingEndpointId(undefined);
      }
    },
    [notifications]
  );

  return { keys, creatingEndpointId, createApiKey, setVerification };
}
