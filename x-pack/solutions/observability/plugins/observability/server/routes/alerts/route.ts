/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getRelatedDashboardsParamsSchema,
  GetRelatedDashboardsResponse,
} from '@kbn/observability-schema';
import { IKibanaResponse } from '@kbn/core-http-server';
import type { SavedObjectsFindResult } from '@kbn/core/server';
import type { DashboardAttributes } from '@kbn/dashboard-plugin/server/content_management/v3';
import { createObservabilityServerRoute } from '../create_observability_server_route';
import { SuggestedDashboardsClient } from '../../services/suggested_dashboards_client';
import { InvestigateAlertsClient } from '../../services/investigate_alerts_client';
import { AlertNotFoundError } from '../../common/errors/alert_not_found_error';

const alertsDynamicDashboardSuggestions = createObservabilityServerRoute({
  endpoint: 'GET /internal/observability/alerts/suggested_dashboards',
  security: {
    authz: {
      enabled: false,
      reason:
        'This route is opted out from authorization because it is a wrapper around Saved Object client',
    },
  },
  options: { access: 'internal' },
  params: getRelatedDashboardsParamsSchema,
  handler: async (services): Promise<GetRelatedDashboardsResponse | IKibanaResponse> => {
    const { dependencies, params, request, response, context, logger } = services;
    const { alertId } = params.query;
    const { ruleRegistry, dashboard } = dependencies;
    const { contentClient } = dashboard;
    const dashboardClient = contentClient!.getForRequest<
      SavedObjectsFindResult<DashboardAttributes>
    >({
      requestHandlerContext: context,
      request,
      version: 3,
    });

    const alertsClient = await ruleRegistry.getRacClientWithRequest(request);
    const investigateAlertsClient = new InvestigateAlertsClient(alertsClient);

    const dashboardParser = new SuggestedDashboardsClient({
      logger,
      dashboardClient,
      alertId,
      alertsClient: investigateAlertsClient,
    });
    try {
      const { suggestedDashboards } = await dashboardParser.fetchSuggestedDashboards();
      return {
        suggestedDashboards,
        linkedDashboards: [],
      };
    } catch (e) {
      if (e instanceof AlertNotFoundError) {
        return response.badRequest({ body: { message: e.message } });
      }
      throw e;
    }
  },
});

export const alertsSuggestedDashboardRepository = alertsDynamicDashboardSuggestions;
