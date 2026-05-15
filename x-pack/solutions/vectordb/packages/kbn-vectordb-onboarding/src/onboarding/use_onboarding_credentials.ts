/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { ONBOARDING_API_KEY_STORAGE_KEY } from '../storage_keys';
import { useOnboardingApiPaths } from '../api_paths';
import { useKibana } from '../services';

interface CachedKey {
  id: string;
  name: string;
  encoded: string;
}

// Module-level in-flight promise so concurrent hook instances share one request.
let inFlightApiKeyRequest: Promise<string | null> | null = null;

const readCachedKey = (): CachedKey | null => {
  try {
    const raw = sessionStorage.getItem(ONBOARDING_API_KEY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CachedKey) : null;
  } catch {
    return null;
  }
};

const writeCachedKey = (key: CachedKey) => {
  try {
    sessionStorage.setItem(ONBOARDING_API_KEY_STORAGE_KEY, JSON.stringify(key));
  } catch {
    // sessionStorage unavailable (e.g. private browsing) — proceed without caching
  }
};

const fetchApiKey = (
  http: ReturnType<typeof useKibana>['services']['http'],
  apiKeyPath: string
) => {
  const cached = readCachedKey();
  if (cached) {
    return Promise.resolve(cached.encoded);
  }

  if (inFlightApiKeyRequest) {
    return inFlightApiKeyRequest;
  }

  inFlightApiKeyRequest = http
    .post<CachedKey>(apiKeyPath, {
      body: JSON.stringify({}),
    })
    .then((result) => {
      writeCachedKey(result);
      return result.encoded;
    })
    .catch(() => null)
    .finally(() => {
      inFlightApiKeyRequest = null;
    });

  return inFlightApiKeyRequest;
};

export interface OnboardingCredentials {
  elasticsearchUrl: string | null;
  apiKey: string | null;
  isLoading: boolean;
}

export const useOnboardingCredentials = (): OnboardingCredentials => {
  const {
    services: { http, cloud },
  } = useKibana();
  const { apiKey: apiKeyPath } = useOnboardingApiPaths();
  const [elasticsearchUrl, setElasticsearchUrl] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(() => readCachedKey()?.encoded ?? null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const urlPromise = cloud
      ? cloud
          .fetchElasticsearchConfig()
          .then((c) => c.elasticsearchUrl ?? null)
          .catch(() => null)
      : Promise.resolve(null);

    const keyPromise = fetchApiKey(http, apiKeyPath);

    Promise.all([urlPromise, keyPromise]).then(([url, key]) => {
      if (cancelled) return;
      setElasticsearchUrl(url);
      setApiKey(key);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [http, cloud, apiKeyPath]);

  return { elasticsearchUrl, apiKey, isLoading };
};
