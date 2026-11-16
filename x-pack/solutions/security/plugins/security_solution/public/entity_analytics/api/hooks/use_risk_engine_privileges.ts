/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@kbn/react-query';
import {
  buildExecutionContext,
  EA_EXECUTION_CONTEXT_NAMES,
} from '../../../common/utils/execution_context';
import { useEntityAnalyticsRoutes } from '../api';

const RISK_ENGINE_PRIVILEGES_CONTEXT = buildExecutionContext(
  EA_EXECUTION_CONTEXT_NAMES.RISK_SCORE_MANAGEMENT,
  'risk_engine_privileges'
);

export const useRiskEnginePrivileges = () => {
  const { fetchRiskEnginePrivileges } = useEntityAnalyticsRoutes();
  return useQuery(['GET', 'FETCH_RISK_ENGINE_PRIVILEGES'], () =>
    fetchRiskEnginePrivileges({ context: RISK_ENGINE_PRIVILEGES_CONTEXT })
  );
};
