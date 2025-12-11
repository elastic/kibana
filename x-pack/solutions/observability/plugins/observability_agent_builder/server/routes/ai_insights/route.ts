/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { apiPrivileges } from '@kbn/onechat-plugin/common/features';
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
        index: t.array(t.string),
        id: t.array(t.string),
      }),
    }),
    handler: async (args) => {
      const { request, core, plugins, dataRegistry, params, logger } = args;
      const { index, id } = params.body;

      const [_, pluginsStart] = await core.getStartServices();

      const defaultConnector = await pluginsStart.inference.getDefaultConnector(request);

      if (!defaultConnector) {
        throw new Error('No default connector found');
      }

      const inferenceClient = pluginsStart.inference.getClient({ request });

      const logEntry = await dataRegistry.getData('getLogDocumentById', {
        request,
        index,
        id,
      });

      if (!logEntry) {
        throw new Error('Log entry not found');
      }

      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
      const logTimestamp = new Date(logEntry._source['@timestamp']).getTime();
      const serviceSummary = await dataRegistry.getData('apmServiceSummary', {
        request,
        serviceName: logEntry._source.service.name,
        serviceEnvironment: logEntry._source.service.environment,
        start: new Date(logTimestamp - TWENTY_FOUR_HOURS_MS).toISOString(),
        end: new Date(logTimestamp + TWENTY_FOUR_HOURS_MS).toISOString(),
      });

      const summary = await getLogAiInsights({
        index,
        id,
        fields: logEntry.fields,
        serviceSummary,
        inferenceClient,
        connectorId: defaultConnector?.connectorId,
      });

      return { context: logEntry.fields, summary };
    },
  });

  return {
    ...logAiInsightsRoute,
    ...getAlertAiInsightRoute,
  };
}
