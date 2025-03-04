/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { HttpSetup, IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { ObservabilityOnboardingAppServices } from '../../..';

interface OnboardingApiKeyResponse {
  apiKeyEncoded: string;
}
interface APMApiKeyResponse {
  agentKey: { name: string; encoded: string };
}

export function useEncodedApiKey() {
  const [encodedApiKey, setEncodedApiKey] = useState<string | null>(null);
  const [error, setError] = useState<IHttpFetchError<ResponseErrorBody> | null>(null);

  const {
    services: {
      http,
      context: { isServerless },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();

  useEffect(() => {
    requestEncodedApiKey(isServerless, http)
      .then((apiKey) => {
        setEncodedApiKey(apiKey);
      })
      .catch((err) => {
        setError(err);
      });
  }, [http, isServerless]);

  return { encodedApiKey, error };
}

/**
 * Managed OTel collector for now APM API keys.
 * See https://github.com/elastic/kibana/issues/208035#issuecomment-2654482081
 */
function requestEncodedApiKey(isServerless: boolean, http: HttpSetup): Promise<string> {
  let requestPromise: Promise<string>;

  if (isServerless) {
    const timestamp = new Date().toISOString();

    requestPromise = http
      .post<APMApiKeyResponse>('/api/apm/agent_keys', {
        body: JSON.stringify({
          name: `ingest-otel-host-${timestamp}`,
          privileges: ['event:write'],
        }),
      })
      .then((res) => res.agentKey.encoded);
  } else {
    requestPromise = http
      .post<OnboardingApiKeyResponse>('/internal/observability_onboarding/otel/api_key')
      .then((res) => res.apiKeyEncoded);
  }

  return requestPromise;
}
