/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { buildExecutionContext } from '../../../common';

export const useFetchMonitoredIndices = () => {
  const { listPrivMonMonitoredIndices } = useEntityAnalyticsRoutes();
  return useQuery(
    ['POST', 'LIST_PRIVILEGED_USER_MONITORED_INDICES'],
    ({ signal }) =>
      listPrivMonMonitoredIndices({
        signal,
        context: buildExecutionContext(
          'entity_analytics:privileged_user_monitoring',
          'pum_monitored_indices_list'
        ),
      }),
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );
};
