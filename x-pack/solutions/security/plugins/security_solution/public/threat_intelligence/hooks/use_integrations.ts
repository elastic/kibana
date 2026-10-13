/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryFunctionContext, useQuery, useQueryClient } from '@kbn/react-query';
import { useCallback, useEffect } from 'react';
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
 * We cancel the query in case it's taking too long to not block the Indicators page for the user.
 */
export const useIntegrations = ({ enabled }: { enabled: boolean }) => {
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

  const queryClient = useQueryClient();
  const { fetchStatus } = query;

  useEffect(() => {
    // the query stays disabled until the indicators count has resolved, so the timeout can only be
    // armed once the request is in flight: cancelling a query that has not started yet is a no-op
    // that leaves the actual call unbounded
    if (fetchStatus !== 'fetching') {
      return;
    }

    // cancel slow integrations call to unblock the UI. `revert: false` is what makes the
    // cancellation terminal: the default reverts the query to its pre-fetch loading state, with
    // nothing left to settle it, and the page would wait on it forever
    const timeoutId = setTimeout(() => {
      queryClient.cancelQueries({ queryKey }, { revert: false });
    }, INTEGRATIONS_CALL_TIMEOUT);

    return () => clearTimeout(timeoutId);
  }, [fetchStatus, queryClient]);

  return query;
};
