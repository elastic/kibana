/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import type { PrivMonHealthResponse } from '../../../../common/api/entity_analytics/privilege_monitoring/health.gen';
import { useEntityAnalyticsRoutes } from '../api';

export const usePrivilegedMonitoringEngineStatus = () => {
  const { fetchPrivilegeMonitoringEngineStatus } = useEntityAnalyticsRoutes();
  return useQuery<PrivMonHealthResponse, SecurityAppError>({
    queryKey: ['GET', 'FETCH_PRIVILEGED_MONITORING_ENGINE_STATUS'],
    queryFn: fetchPrivilegeMonitoringEngineStatus,
    retry: 0,
  });
};
