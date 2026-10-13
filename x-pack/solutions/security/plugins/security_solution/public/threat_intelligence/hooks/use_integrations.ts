/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import { useCallback, useEffect, useState } from 'react';
import { filterIntegrations } from '../utils/filter_integrations';
import { useKibana } from '../../common/lib/kibana';

type IntegrationInstallStatus = 'installed' | 'installing' | 'install_failed';

const INTEGRATIONS_URL = '/api/fleet/epm/packages';

const INTEGRATIONS_CALL_TIMEOUT = 2000;

export interface IntegrationResponse {
  items: Integration[];
}

export interface Integration {
  categories: string[];
  id: string;
  status: IntegrationInstallStatus;
}

const queryKey = ['integrations-threat-intel'];

/**
 * Retrieves integrations from the Fleet plugin endpoint /api/fleet/epm/packages.
 * The integrations are then filtered, and we only keep the installed ones,
 * with category threat_intel and excluding the ti_utils integration.
 * We stop reporting `isLoading` once the call takes too long, to not block the Indicators page for
 * the user. The request itself keeps running, so late results still resolve to the real list.
 */
export const useIntegrations = ({ enabled }: { enabled: boolean }) => {
  const [hasTimedOut, setHasTimedOut] = useState<boolean>(false);

  const { http } = useKibana().services;

  // retrieving the list of integrations from the fleet plugin's endpoint
  const fetchIntegrations = useCallback(
    (context: QueryFunctionContext) =>
      http.get<IntegrationResponse>(INTEGRATIONS_URL, {
        version: '2023-10-31',
        signal: context.signal,
      }),
    [http]
  );

  const query = useQuery(queryKey, fetchIntegrations, {
    select: (data: IntegrationResponse) => (data ? filterIntegrations(data.items) : []),
    enabled,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timeoutId = setTimeout(() => setHasTimedOut(true), INTEGRATIONS_CALL_TIMEOUT);

    return () => clearTimeout(timeoutId);
  }, [enabled]);

  return { ...query, isLoading: query.isLoading && !hasTimedOut };
};
