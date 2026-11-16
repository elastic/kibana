/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import { useQuery } from '@kbn/react-query';
import type { EntityAnalyticsPrivileges } from '../../../../common/api/entity_analytics';
import {
  buildExecutionContext,
  EA_EXECUTION_CONTEXT_NAMES,
} from '../../../common/utils/execution_context';
import { useEntityAnalyticsRoutes } from '../api';

const WATCHLISTS_PRIVILEGES_CONTEXT = buildExecutionContext(
  EA_EXECUTION_CONTEXT_NAMES.WATCHLISTS,
  'watchlists_privileges'
);

export const useWatchlistsPrivileges = () => {
  const { fetchWatchlistsPrivileges } = useEntityAnalyticsRoutes();
  return useQuery<EntityAnalyticsPrivileges, SecurityAppError>({
    queryKey: ['GET', 'FETCH_WATCHLISTS_PRIVILEGES'],
    queryFn: () => fetchWatchlistsPrivileges({ context: WATCHLISTS_PRIVILEGES_CONTEXT }),
    retry: 0,
  });
};
