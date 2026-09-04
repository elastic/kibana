/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, notFound, serverUnavailable } from '@hapi/boom';
import { InvestigationUnavailableError } from '@kbn/nightshift-investigations-plugin/server';
import { z } from '@kbn/zod/v4';
import { ALERTS_API_URLS } from '../../../common/constants';
import { InvestigateAlertsClient } from '../../services/investigate_alerts_client';
import { AlertNotFoundError } from '../../common/errors/alert_not_found_error';
import { createObservabilityServerRoute } from '../create_observability_server_route';
import { parseAlertSnapshot } from './build_alert_snapshot';

const availabilityRoute = createObservabilityServerRoute({
  endpoint: `GET ${ALERTS_API_URLS.INTERNAL_INVESTIGATION_AVAILABILITY}`,
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['agentBuilder:write'] } },
  params: z.object({}),
  handler: async ({ dependencies, request }) => ({
    available:
      (await dependencies.nightshiftInvestigations?.isInvestigationAvailable(request)) === true,
  }),
});

const investigateRoute = createObservabilityServerRoute({
  endpoint: `POST ${ALERTS_API_URLS.INTERNAL_START_ALERT_INVESTIGATION}`,
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['agentBuilder:write'] } },
  params: z.object({
    path: z.object({ alertId: z.string().min(1).max(500) }),
  }),
  handler: async ({ dependencies, request, params }) => {
    const { nightshiftInvestigations, ruleRegistry } = dependencies;
    if (!nightshiftInvestigations) {
      throw serverUnavailable('Investigations are unavailable');
    }

    const alertsClient = await ruleRegistry.getRacClientWithRequest(request);
    const rulesClient = await ruleRegistry.alerting.getRulesClientWithRequest(request);
    const investigateAlertsClient = new InvestigateAlertsClient(alertsClient, rulesClient);

    try {
      const alert = await investigateAlertsClient.getAlertById(params.path.alertId);
      const snapshot = parseAlertSnapshot(alert.getRawAlert());
      if (!snapshot) {
        throw badRequest('Alert does not contain the fields required for an investigation');
      }
      return await nightshiftInvestigations.getInvestigationsClient(request).start({
        subject: { type: 'alert', id: snapshot.id },
        concurrency_key: snapshot.id,
        context: { alerts: [snapshot] },
      });
    } catch (error) {
      if (error instanceof AlertNotFoundError) {
        throw notFound(error.message);
      }
      if (error instanceof InvestigationUnavailableError) {
        throw serverUnavailable(error.message);
      }
      throw error;
    }
  },
});

export const alertInvestigationRouteRepository = {
  ...availabilityRoute,
  ...investigateRoute,
};
