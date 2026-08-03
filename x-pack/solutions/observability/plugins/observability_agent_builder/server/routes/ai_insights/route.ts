/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { apiPrivileges } from '@kbn/onechat-plugin/common/features';
import { generateErrorAiInsight } from './apm_error/generate_error_ai_insight';
import { createObservabilityAgentBuilderServerRoute } from '../create_observability_agent_builder_server_route';
import { getLogAiInsights } from './get_log_ai_insights';
import { getAlertAiInsight, type AlertDocForInsight } from './get_alert_ai_insights';
import { getDefaultConnectorId } from '../../utils/get_default_connector_id';

export function getObservabilityAgentBuilderAiInsightsRouteRepository() {
  const getAlertAiInsightRoute = createObservabilityAgentBuilderServerRoute({
    endpoint: 'POST /internal/observability_agent_builder/ai_insights/alert',
    options: {
      access: 'internal',
    },
    security: {
      authz: {
        requiredPrivileges: [apiPrivileges.readOnechat],
      },
    },
    params: t.type({
      body: t.type({
        alertId: t.string,
      }),
    }),
    handler: async ({
      core,
      dataRegistry,
      logger,
      request,
      params,
    }): Promise<{ summary: string; context: string }> => {
      const { alertId } = params.body;

      const [coreStart, startDeps] = await core.getStartServices();
      const { inference, ruleRegistry } = startDeps;

      const connectorId = await getDefaultConnectorId({ coreStart, inference, request, logger });
      const inferenceClient = inference.getClient({ request });

      const alertsClient = await ruleRegistry.getRacClientWithRequest(request);
      const alertDoc = (await alertsClient.get({ id: alertId })) as AlertDocForInsight;

      const { summary, context } = await getAlertAiInsight({
        alertDoc,
        inferenceClient,
        connectorId,
        dataRegistry,
        request,
        logger,
      });

      return {
        summary,
        context,
      };
    },
  });

  const errorAiInsightsRoute = createObservabilityAgentBuilderServerRoute({
    endpoint: 'POST /internal/observability_agent_builder/ai_insights/error',
    options: {
      access: 'internal',
    },
    security: {
      authz: {
        requiredPrivileges: [apiPrivileges.readOnechat],
      },
    },
    params: t.type({
      body: t.type({
        errorId: t.string,
        start: t.string,
        end: t.string,
        serviceName: t.string,
        environment: t.union([t.string, t.undefined]),
      }),
    }),
    handler: async ({ request, core, plugins, dataRegistry, params, logger }) => {
      const { errorId, serviceName, start, end, environment = '' } = params.body;

      const [coreStart, startDeps] = await core.getStartServices();
      const { inference } = startDeps;

      const connectorId = await getDefaultConnectorId({ coreStart, inference, request, logger });
      const inferenceClient = inference.getClient({ request, bindTo: { connectorId } });

      const { summary, context } = await generateErrorAiInsight({
        core,
        plugins,
        errorId,
        serviceName,
        start,
        end,
        environment,
        dataRegistry,
        request,
        inferenceClient,
        logger,
      });

      return {
        context,
        summary,
      };
    },
  });

  const logAiInsightsRoute = createObservabilityAgentBuilderServerRoute({
    endpoint: 'POST /internal/observability_agent_builder/ai_insights/log',
    options: {
      access: 'internal',
    },
    security: {
      authz: {
        requiredPrivileges: [apiPrivileges.readOnechat],
      },
    },
    params: t.type({
      body: t.partial({
        index: t.string,
        id: t.string,
        fields: t.record(t.string, t.unknown),
      }),
    }),
    handler: async ({ request, core, params, response, dataRegistry }) => {
      const { index, id, fields } = params.body;

      const hasDocIdentity = typeof index === 'string' && typeof id === 'string';
      // if a user is in ESQL mode, there is currently no id or index metadata
      // unless a user specifically queries for it, so pass fields directly
      const hasFields = fields && Object.keys(fields).length > 0;

      if (!hasDocIdentity && !hasFields) {
        return response.badRequest({
          body: 'Must provide either {index, id} or {fields}',
        });
      }

      const [coreStart, startDeps] = await core.getStartServices();
      const { inference } = startDeps;

      const connectorId = await getDefaultConnectorId({ coreStart, inference, request });
      const inferenceClient = inference.getClient({ request });
      const esClient = coreStart.elasticsearch.client.asScoped(request);

      const { summary, context } = await getLogAiInsights({
        index,
        id,
        fields,
        inferenceClient,
        connectorId,
        request,
        esClient,
        dataRegistry,
      });

      return { summary, context };
    },
  });

  return {
    ...logAiInsightsRoute,
    ...errorAiInsightsRoute,
    ...getAlertAiInsightRoute,
  };
}
