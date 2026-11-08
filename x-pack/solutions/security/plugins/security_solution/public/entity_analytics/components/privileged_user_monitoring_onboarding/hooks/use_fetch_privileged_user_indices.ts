/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import {
  buildExecutionContext,
  EA_EXECUTION_CONTEXT_NAMES,
} from '../../../../common/utils/execution_context';

const PUM_INDICES_SEARCH_CONTEXT = buildExecutionContext(
  EA_EXECUTION_CONTEXT_NAMES.PRIVILEGED_USER_MONITORING,
  'pum_indices_search'
);

export const useFetchPrivilegedUserIndices = (query: string | undefined) => {
  const { searchPrivMonIndices } = useEntityAnalyticsRoutes();
  return useQuery(
    ['POST', 'SEARCH_PRIVILEGED_USER_MONITORING_INDICES', query],
    ({ signal }) => searchPrivMonIndices({ signal, query, context: PUM_INDICES_SEARCH_CONTEXT }),
    {
      keepPreviousData: true,
      cacheTime: 0, // Do not cache the data because it is used by an autocomplete query
      refetchOnWindowFocus: false,
    }
  );
};
