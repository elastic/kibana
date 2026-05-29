/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { ONBOARDING_API_KEY_STORAGE_KEY } from '../storage_keys';
import { useOnboardingApiPaths } from '../api_paths';
import { useKibana } from '../services';

interface CachedKey {
  id: string;
  name: string;
  encoded: string;
}

interface ApiKeyResponse {
  id: string | null;
  name: string | null;
  encoded: string | null;
}

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

  const { data, isLoading } = useQuery({
    queryKey: ['onboardingCredentials', apiKeyPath],
    queryFn: async () => {
      const urlPromise = cloud
        ? cloud
            .fetchElasticsearchConfig()
            .then((c) => c.elasticsearchUrl ?? null)
            .catch(() => null)
        : Promise.resolve(null);

      const keyPromise = (() => {
        const cached = readCachedKey();
        if (cached) return Promise.resolve(cached.encoded);
        return http
          .post<ApiKeyResponse>(apiKeyPath, { body: JSON.stringify({}) })
          .then((result) => {
            if (result.encoded && result.id && result.name) {
              writeCachedKey({ id: result.id, name: result.name, encoded: result.encoded });
            }
            return result.encoded;
          })
          .catch(() => null);
      })();

      const [elasticsearchUrl, apiKey] = await Promise.all([urlPromise, keyPromise]);
      return { elasticsearchUrl, apiKey };
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  return {
    elasticsearchUrl: data?.elasticsearchUrl ?? null,
    apiKey: data?.apiKey ?? null,
    isLoading,
  };
};
