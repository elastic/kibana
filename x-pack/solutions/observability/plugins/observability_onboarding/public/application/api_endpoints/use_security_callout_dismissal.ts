/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { ApiEndpointId } from '../../../common/api_endpoints';
import { readStoredFlags, sanitizeStoredFlags } from './read_stored_flags';

const DISMISSED_CALLOUT_STORAGE_KEY =
  'observabilityOnboarding.apiEndpoints.dismissedSecurityCallout';

export interface UseSecurityCalloutDismissalResult {
  dismissedByEndpointId: Partial<Record<ApiEndpointId, boolean>>;
  dismissCallout: (endpointId: ApiEndpointId) => void;
}

export function useSecurityCalloutDismissal(): UseSecurityCalloutDismissalResult {
  const [dismissedInStorage, setDismissedInStorage] = useLocalStorage<
    Partial<Record<ApiEndpointId, boolean>>
  >(DISMISSED_CALLOUT_STORAGE_KEY);

  const dismissCallout = useCallback(
    (endpointId: ApiEndpointId) => {
      setDismissedInStorage({
        ...readStoredFlags(DISMISSED_CALLOUT_STORAGE_KEY),
        [endpointId]: true,
      });
    },
    [setDismissedInStorage]
  );

  return {
    dismissedByEndpointId: sanitizeStoredFlags(dismissedInStorage),
    dismissCallout,
  };
}
