/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useCallback, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { useKibana } from '../../hooks/use_kibana';
import { callObservabilityOnboardingApi } from '../../services/rest/create_call_api';
import type { ApiEndpointId } from '../../../common/api_endpoints';
import { readStoredFlags, sanitizeStoredFlags } from './read_stored_flags';

const CREATED_KEYS_STORAGE_KEY = 'observabilityOnboarding.apiEndpoints.createdKeys';

export interface UseApiKeysResult {
  encodedApiKeys: Partial<Record<ApiEndpointId, string>>;
  keyCreatedBeforeByEndpointId: Partial<Record<ApiEndpointId, boolean>>;
  creatingEndpointId?: ApiEndpointId;
  createApiKey: (endpointId: ApiEndpointId) => Promise<void>;
}

export function useApiKeys(): UseApiKeysResult {
  const {
    services: { notifications },
  } = useKibana();
  const [encodedApiKeys, setEncodedApiKeys] = useState<Partial<Record<ApiEndpointId, string>>>({});
  const [creatingEndpointId, setCreatingEndpointId] = useState<ApiEndpointId | undefined>(
    undefined
  );
  const [createdKeysInStorage, setCreatedKeysInStorage] =
    useLocalStorage<Partial<Record<ApiEndpointId, boolean>>>(CREATED_KEYS_STORAGE_KEY);

  const createApiKey = useCallback(
    async (endpointId: ApiEndpointId) => {
      setCreatingEndpointId(endpointId);
      try {
        const { encodedApiKey } = await callObservabilityOnboardingApi(
          'POST /internal/observability_onboarding/api_endpoints/create_key/{id}',
          { signal: null, params: { path: { id: endpointId } } }
        );
        setEncodedApiKeys((previous) => ({ ...previous, [endpointId]: encodedApiKey }));
        setCreatedKeysInStorage({
          ...readStoredFlags(CREATED_KEYS_STORAGE_KEY),
          [endpointId]: true,
        });
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
    [notifications, setCreatedKeysInStorage]
  );

  return {
    encodedApiKeys,
    keyCreatedBeforeByEndpointId: sanitizeStoredFlags(createdKeysInStorage),
    creatingEndpointId,
    createApiKey,
  };
}
