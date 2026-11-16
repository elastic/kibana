/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@kbn/react-query';
import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import type { PrivMonPrivilegesResponse } from '../../../../common/api/entity_analytics';
import {
  buildExecutionContext,
  EA_EXECUTION_CONTEXT_NAMES,
} from '../../../common/utils/execution_context';
import { useEntityAnalyticsRoutes } from '../api';

const PUM_PRIVILEGES_CONTEXT = buildExecutionContext(
  EA_EXECUTION_CONTEXT_NAMES.PRIVILEGED_USER_MONITORING,
  'pum_privileges'
);

export const usePrivilegedMonitoringPrivileges = () => {
  const { fetchPrivilegeMonitoringPrivileges } = useEntityAnalyticsRoutes();
  // TODO: remove this hook when privmon UI is retired. https://github.com/elastic/security-team/issues/16105
  return useQuery<PrivMonPrivilegesResponse, SecurityAppError>({
    queryKey: ['GET', 'FETCH_PRIVILEGED_MONITORING_PRIVILEGES'],
    queryFn: () => fetchPrivilegeMonitoringPrivileges({ context: PUM_PRIVILEGES_CONTEXT }),
    retry: 0,
  });
};
