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

export function getObservabilityAgentBuilderAiInsightsRouteRepository() {
  const exampleRoute = createObservabilityAgentBuilderServerRoute({
    endpoint: 'POST /internal/observability_agent_builder/ai_insights/example',
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
        id: t.string,
      }),
    }),
    handler: async ({ params }) => {
      return { id: params.body.id };
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
        fields: t.record(t.string, t.any),
        connectorId: t.union([t.string, t.undefined]),
      }),
    }),
    handler: async (args) => {
      const { request, core, plugins, dataRegistry, params, logger } = args;
      const { fields, connectorId: lastUsedConnectorId } = params.body;

      const [_, pluginsStart] = await core.getStartServices();

      let connectorId = lastUsedConnectorId;
      if (!connectorId) {
        const defaultConnector = await pluginsStart.inference.getDefaultConnector(request);
        connectorId = defaultConnector?.connectorId;
      }

      if (!connectorId) {
        throw new Error('No default connector found');
      }

      const inferenceClient = pluginsStart.inference.getClient({ request });

      const [coreStart] = await core.getStartServices();
      const esClient = coreStart.elasticsearch.client.asScoped(request);
      const index = fields.find((field) => field.field === '_index')?.value;
      const id = fields.find((field) => field.field === '_id')?.value;
      const result = await esClient.asCurrentUser.search({
        index,
        query: {
          bool: {
            filter: [
              {
                ids: {
                  values: id,
                },
              },
            ],
          },
        },
        fields: [
          {
            field: '*',
            include_unmapped: true,
          },
        ],
      });
      const logEntry = result.hits.hits[0]._source;
      const logEntryFields = result.hits.hits[0].fields;
      if (!logEntry) {
        throw new Error('Log entry not found');
      }

      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
      const logTimestamp = new Date(logEntry['@timestamp']).getTime();
      const serviceSummary = await dataRegistry.getData('apmServiceSummary', {
        request,
        serviceName: logEntry.service.name,
        serviceEnvironment: logEntry.service.environment,
        start: new Date(logTimestamp - TWENTY_FOUR_HOURS_MS).toISOString(),
        end: new Date(logTimestamp + TWENTY_FOUR_HOURS_MS).toISOString(),
      });

      const { context, summary } = await getLogAiInsights({
        index,
        id,
        fields: logEntryFields,
        serviceSummary,
        inferenceClient,
        connectorId,
      });

      return { context, summary };
    },
  });

  return {
    ...exampleRoute,
    ...logAiInsightsRoute,
  };
}
