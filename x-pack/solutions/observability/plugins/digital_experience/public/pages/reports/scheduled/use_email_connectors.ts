/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import {
  REPORT_EMAIL_CONNECTORS_ENDPOINT,
  type EmailConnectorOption,
} from '../../../../common/types/scheduled_reports';
import { useApiClient } from '../../../hooks/use_api_client';

/** Loads Workflows availability and email connectors for the current space. */
export const useEmailConnectors = (
  enabled = true
): {
  available: boolean | undefined;
  emailConnectors: EmailConnectorOption[];
  isLoading: boolean;
  error: Error | undefined;
  refresh: () => void;
} => {
  const apiClient = useApiClient();

  const { value, loading, error, refresh } = useAbortableAsync(
    async ({ signal }) => {
      if (!enabled) {
        return { available: false, emailConnectors: [] as EmailConnectorOption[] };
      }
      return apiClient.fetch(REPORT_EMAIL_CONNECTORS_ENDPOINT, { signal });
    },
    [apiClient, enabled]
  );

  return {
    available: value?.available,
    emailConnectors: value?.emailConnectors ?? [],
    isLoading: enabled && loading,
    error,
    refresh,
  };
};
