/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { useEntityAnalyticsRoutes } from '../api';

export const useGetWatchlists = ({
  executionContext,
}: {
  /**
   * Optional Kibana execution context forwarded to the watchlists fetch so slow logs and
   * APM traces can attribute the query to the calling page/panel.
   */
  executionContext?: KibanaExecutionContext;
} = {}) => {
  const { fetchWatchlists } = useEntityAnalyticsRoutes();

  return useQuery({
    queryKey: ['GET', 'WATCHLISTS'],
    queryFn: ({ signal }) =>
      fetchWatchlists({
        signal,
        context: executionContext,
      }),
  });
};
