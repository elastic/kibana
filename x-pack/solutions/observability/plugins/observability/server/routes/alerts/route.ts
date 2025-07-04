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
import type { DashboardAttributes } from '@kbn/dashboard-plugin/server';
import { ALERTS_API_URLS } from '../../../common/constants';
import { createObservabilityServerRoute } from '../create_observability_server_route';
import { RelatedDashboardsClient } from '../../services/related_dashboards_client';
import { InvestigateAlertsClient } from '../../services/investigate_alerts_client';
import { AlertNotFoundError } from '../../common/errors/alert_not_found_error';

const alertsDynamicDashboardSuggestions = createObservabilityServerRoute({
  endpoint: `GET ${ALERTS_API_URLS.INTERNAL_RELATED_DASHBOARDS}`,
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
    const { getContentClient } = dashboard;
    const dashboardClient = getContentClient()!.getForRequest<
      SavedObjectsFindResult<DashboardAttributes>
    >({
      requestHandlerContext: context,
      request,
      version: 1,
    });

    const alertsClient = await ruleRegistry.getRacClientWithRequest(request);
    const rulesClient = await ruleRegistry.alerting.getRulesClientWithRequest(request);
    const investigateAlertsClient = new InvestigateAlertsClient(alertsClient, rulesClient);

    const dashboardParser = new RelatedDashboardsClient(
      logger,
      dashboardClient,
      investigateAlertsClient,
      alertId
    );
    try {
      const { suggestedDashboards, linkedDashboards } =
        await dashboardParser.fetchRelatedDashboards();
      return {
        suggestedDashboards,
        linkedDashboards,
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
