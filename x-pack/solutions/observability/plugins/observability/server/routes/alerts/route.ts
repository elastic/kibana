/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getRecommendedDashboardsParamsSchema,
  GetRecommendedDashboardsResponse,
} from '@kbn/observability-schema';
import { createObservabilityServerRoute } from '../create_observability_server_route';
import { createDashboardsClient } from '../../services/create_dashboards_client';
import { SuggestedDashboardsClient } from '../../services/suggested_dashboards_client';
import { InvestigateAlertsClient } from '../../services/investigate_alerts_client';

const alertsDynamicDashboardSuggestions = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/alerts/recommended_dashboards 2023-10-31',
  security: {
    authz: {
      enabled: false,
      reason: 'TODO: This endpoint returns related dashboards requires no specific authorization',
    },
  },
  options: { access: 'public' },
  params: getRecommendedDashboardsParamsSchema,
  handler: async (services): Promise<GetRecommendedDashboardsResponse> => {
    const { dependencies, params, request, context, logger } = services;
    const { alertId } = params.query;
    const { ruleRegistry } = dependencies;

    const alertsClient = await ruleRegistry.getRacClientWithRequest(request);
    const investigateAlertsClient = new InvestigateAlertsClient(alertsClient);

    const dashboardClient = await createDashboardsClient({ request, context });
    const dashboardParser = new SuggestedDashboardsClient({
      logger,
      dashboardClient,
      alertId,
      alertsClient: investigateAlertsClient,
    });
    const { dashboards } = await dashboardParser.fetchSuggestedDashboards();
    return {
      dashboards,
    };
  },
});

export const alertsRouteRepository = alertsDynamicDashboardSuggestions;
