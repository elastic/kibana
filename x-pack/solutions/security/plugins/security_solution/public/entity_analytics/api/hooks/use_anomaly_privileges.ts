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

export const ANOMALY_PRIVILEGES_QUERY_KEY = 'anomaly-privileges';

const ANOMALY_PRIVILEGES_CONTEXT = buildExecutionContext(
  EA_EXECUTION_CONTEXT_NAMES.ENTITY_DETAILS_FLYOUT,
  'anomaly_privileges'
);

export const useAnomalyPrivileges = (enabled = true) => {
  const { fetchAnomalyPrivileges } = useEntityAnalyticsRoutes();
  return useQuery<EntityAnalyticsPrivileges, SecurityAppError>({
    queryKey: [ANOMALY_PRIVILEGES_QUERY_KEY],
    queryFn: () => fetchAnomalyPrivileges({ context: ANOMALY_PRIVILEGES_CONTEXT }),
    enabled,
    retry: 0,
  });
};
