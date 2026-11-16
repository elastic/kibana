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

export const LEAD_GENERATION_PRIVILEGES_QUERY_KEY = 'lead-generation-privileges';

const LEAD_GENERATION_PRIVILEGES_CONTEXT = buildExecutionContext(
  EA_EXECUTION_CONTEXT_NAMES.THREAT_HUNTING_LEADS,
  'leads_privileges'
);

export const useLeadGenerationPrivileges = (enabled = true) => {
  const { fetchLeadGenerationPrivileges } = useEntityAnalyticsRoutes();
  return useQuery<EntityAnalyticsPrivileges, SecurityAppError>({
    queryKey: [LEAD_GENERATION_PRIVILEGES_QUERY_KEY],
    queryFn: () => fetchLeadGenerationPrivileges({ context: LEAD_GENERATION_PRIVILEGES_CONTEXT }),
    enabled,
    retry: 0,
  });
};
