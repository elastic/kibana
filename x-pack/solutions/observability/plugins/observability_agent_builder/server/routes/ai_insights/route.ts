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
import { getLogDocumentById } from './get_log_document_by_id';

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

      const connectorId = await getDefaultConnectorId({ coreStart, inference, request });
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

      const connectorId = await getDefaultConnectorId({ coreStart, inference, request });
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
      body: t.type({
        index: t.string,
        id: t.string,
      }),
    }),
    handler: async ({ request, core, dataRegistry, params }) => {
      const { index, id } = params.body;

      const [coreStart, startDeps] = await core.getStartServices();
      const { inference } = startDeps;

      const connectorId = await getDefaultConnectorId({ coreStart, inference, request });
      const inferenceClient = inference.getClient({ request });
      const esClient = coreStart.elasticsearch.client.asScoped(request);

      const logEntry = await getLogDocumentById({
        esClient: esClient.asCurrentUser,
        index,
        id,
      });

      if (!logEntry) {
        throw new Error('Log entry not found');
      }

      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
      const logTimestamp = new Date(logEntry['@timestamp'] as string).getTime();
      const serviceSummary = await dataRegistry.getData('apmServiceSummary', {
        request,
        serviceName: logEntry.service.name,
        serviceEnvironment: logEntry.service.environment,
        start: new Date(logTimestamp - TWENTY_FOUR_HOURS_MS).toISOString(),
        end: new Date(logTimestamp + TWENTY_FOUR_HOURS_MS).toISOString(),
      });

      const summary = await getLogAiInsights({
        index,
        id,
        fields: logEntry,
        serviceSummary,
        inferenceClient,
        connectorId,
      });

      return { context: logEntry.fields, summary };
    },
  });

  return {
    ...logAiInsightsRoute,
    ...errorAiInsightsRoute,
    ...getAlertAiInsightRoute,
  };
}
