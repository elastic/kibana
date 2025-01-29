/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { TaskManagerUnavailableResponse } from '../../../../common/api/entity_analytics/common';
import { useEntityAnalyticsRoutes } from '../api';
import type { ConfigureRiskEngineSavedObjectResponse } from '../../../../common/api/entity_analytics/risk_engine/engine_configure_saved_object_route.gen';

interface ConfigureRiskEngineParams {
  includeClosedAlerts: boolean;
  range: { start: string; end: string };
}

export const useConfigureSORiskEngineMutation = (
  options?: UseMutationOptions<
    ConfigureRiskEngineSavedObjectResponse,
    { body: ConfigureRiskEngineSavedObjectResponse | TaskManagerUnavailableResponse },
    ConfigureRiskEngineParams
  >
) => {
  const { updateSavedObjectConfiguration } = useEntityAnalyticsRoutes();

  return useMutation<
    ConfigureRiskEngineSavedObjectResponse,
    { body: ConfigureRiskEngineSavedObjectResponse | TaskManagerUnavailableResponse },
    ConfigureRiskEngineParams
  >(async (params: ConfigureRiskEngineParams) => {
    await updateSavedObjectConfiguration({
      exclude_alert_statuses: params.includeClosedAlerts ? [] : ['closed'],
      range: params.range,
    });
    return { risk_engine_saved_object_configured: true };
  }, options);
};
