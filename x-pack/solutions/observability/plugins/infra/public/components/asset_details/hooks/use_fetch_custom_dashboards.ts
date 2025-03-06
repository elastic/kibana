/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { isPending, useFetcher } from '../../../hooks/use_fetcher';
import { InfraGetCustomDashboardsResponseBodyRT } from '../../../../common/http_api/custom_dashboards_api';
import { useRequestObservable } from './use_request_observable';
import { useTabSwitcherContext } from './use_tab_switcher';

interface UseDashboardProps {
  assetType: InventoryItemType;
}

export function useFetchCustomDashboards({ assetType }: UseDashboardProps) {
  const { isActiveTab } = useTabSwitcherContext();
  const { request$ } = useRequestObservable();

  const { data, status, error, refetch } = useFetcher(
    async (callApi) => {
      const response = await callApi(`/api/infra/${assetType}/custom-dashboards`, {
        method: 'GET',
      });

      return decodeOrThrow(InfraGetCustomDashboardsResponseBodyRT)(response);
    },
    [assetType],
    {
      requestObservable$: request$,
      autoFetch: isActiveTab('dashboards'),
    }
  );

  return {
    error: (error && error.message) || null,
    loading: isPending(status),
    dashboards: data,
    reload: refetch,
  };
}
