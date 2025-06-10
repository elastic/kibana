/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import type { FindDashboardsByIdResponse } from '@kbn/dashboard-plugin/public';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';

export interface SearchDashboardsResult {
  data?: FindDashboardsByIdResponse;
  status: FETCH_STATUS;
}

export function useFetchDashboardById(id: string): SearchDashboardsResult {
  const {
    services: { dashboard },
  } = useKibanaContextForPlugin();

  const [result, setResult] = useState<SearchDashboardsResult>({
    data: undefined,
    status: FETCH_STATUS.NOT_INITIATED,
  });

  useEffect(() => {
    const getDashboards = async () => {
      setResult({
        data: undefined,
        status: FETCH_STATUS.LOADING,
      });
      try {
        const findDashboardsService = await dashboard?.findDashboardsService();
        const data = await findDashboardsService.findById(id);

        if (data.status === 'error') {
          setResult({
            data: undefined,
            status: FETCH_STATUS.FAILURE,
          });
          return;
        }
        setResult({
          data,
          status: FETCH_STATUS.SUCCESS,
        });
      } catch {
        setResult({
          data: undefined,
          status: FETCH_STATUS.FAILURE,
        });
      }
    };
    getDashboards();
  }, [dashboard, id]);
  return result;
}
