/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { HttpFetchOptions } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ObservabilityOnboardingContextValue } from '..';

interface FleetSettings {
  prerelease_integrations_enabled?: boolean;
}

interface FleetSettingsResponse {
  item: FleetSettings;
}

interface UseFleetSettingsResult {
  prereleaseIntegrationsEnabled: boolean;
  isLoading: boolean;
  error: Error | null;
}

export const useFleetSettings = (): UseFleetSettingsResult => {
  const {
    services: { http, fleet },
  } = useKibana<ObservabilityOnboardingContextValue>();

  const [prereleaseIntegrationsEnabled, setPrereleaseIntegrationsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Check if user has permission to read Fleet settings
  const canReadSettings = fleet?.authz?.fleet?.readSettings ?? false;

  const fetchSettings = useCallback(async () => {
    if (!http) {
      setIsLoading(false);
      return;
    }

    // If user doesn't have permission to read settings, default to false (no beta integrations)
    if (!canReadSettings) {
      setPrereleaseIntegrationsEnabled(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const options: HttpFetchOptions = {
        headers: { 'Elastic-Api-Version': '2023-10-31' },
      };

      const response = await http.get<FleetSettingsResponse>('/api/fleet/settings', options);
      setPrereleaseIntegrationsEnabled(response.item.prerelease_integrations_enabled ?? false);
      setError(null);
    } catch (err) {
      // If fetching settings fails (e.g., permissions), default to false (no beta integrations)
      setPrereleaseIntegrationsEnabled(false);
      setError(err instanceof Error ? err : new Error('Failed to fetch Fleet settings'));
    } finally {
      setIsLoading(false);
    }
  }, [http, canReadSettings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    prereleaseIntegrationsEnabled,
    isLoading,
    error,
  };
};
