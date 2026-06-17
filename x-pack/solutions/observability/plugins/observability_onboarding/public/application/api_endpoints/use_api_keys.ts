/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useCallback, useState } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { callObservabilityOnboardingApi } from '../../services/rest/create_call_api';
import type { ApiEndpointId } from '../../../common/api_endpoints';

export interface UseApiKeysResult {
  encodedApiKeys: Partial<Record<ApiEndpointId, string>>;
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

  const createApiKey = useCallback(
    async (endpointId: ApiEndpointId) => {
      setCreatingEndpointId(endpointId);
      try {
        const { encodedApiKey } = await callObservabilityOnboardingApi(
          'POST /internal/observability_onboarding/api_endpoints/create_key/{id}',
          { signal: null, params: { path: { id: endpointId } } }
        );
        setEncodedApiKeys((previous) => ({ ...previous, [endpointId]: encodedApiKey }));
      } catch (error) {
        notifications?.toasts.addError(error, {
          title: i18n.translate('xpack.observability_onboarding.apiEndpoints.createKeyError', {
            defaultMessage: 'Failed to create API key',
          }),
        });
      } finally {
        setCreatingEndpointId(undefined);
      }
    },
    [notifications]
  );

  return { encodedApiKeys, creatingEndpointId, createApiKey };
}
