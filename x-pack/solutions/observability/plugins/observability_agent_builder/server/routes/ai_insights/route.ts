/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { ServerRouteRepository } from '@kbn/server-route-repository-utils';
import { apiPrivileges } from '@kbn/agent-builder-plugin/common/features';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
import { getRequestAbortedSignal } from '@kbn/inference-plugin/server/routes/get_request_aborted_signal';
import { generateErrorAiInsight } from './apm_error/generate_error_ai_insight';
import { createObservabilityAgentBuilderServerRoute } from '../create_observability_agent_builder_server_route';
import { getLogAiInsights } from './get_log_ai_insights';
import {
  getAlertAiInsight,
  type AlertDocForInsight,
} from './alert_ai_insights/generate_alert_ai_insight';
import { OBSERVABILITY_AI_INSIGHTS_SUBFEATURE_ID } from '../../../common/constants';
import { resolveConnectorForFeature } from '../../utils/resolve_connector_for_feature';

export function getObservabilityAgentBuilderAiInsightsRouteRepository(): ServerRouteRepository {
  const getAlertAiInsightRoute = createObservabilityAgentBuilderServerRoute({
    endpoint: 'POST /internal/observability_agent_builder/ai_insights/alert',
    options: {
      access: 'internal',
    },
    security: {
      authz: {
        requiredPrivileges: [apiPrivileges.readAgentBuilder],
      },
    },
    params: t.type({
      body: t.type({
        alertId: t.string,
      }),
    }),
    handler: async ({ core, plugins, dataRegistry, logger, request, params, response }) => {
      const { alertId } = params.body;

      const [, startDeps] = await core.getStartServices();
      const { inference, ruleRegistry } = startDeps;

      const { connectorId, connector } = await resolveConnectorForFeature({
        searchInferenceEndpoints: startDeps.searchInferenceEndpoints,
        featureId: OBSERVABILITY_AI_INSIGHTS_SUBFEATURE_ID,
        request,
        logger,
      });

      const inferenceClient = inference.getClient({ request });

      const alertsClient = await ruleRegistry.getRacClientWithRequest(request);
      const alertDoc = (await alertsClient.get({ id: alertId })) as AlertDocForInsight;

      const result = await getAlertAiInsight({
        core,
        plugins,
        alertDoc,
        inferenceClient,
        connectorId,
        connector,
        dataRegistry,
        request,
        logger,
      });

      return response.ok({
        body: observableIntoEventSourceStream(result.events$, {
          logger,
          signal: getRequestAbortedSignal(request),
        }),
      });
    },
  });

  const errorAiInsightsRoute = createObservabilityAgentBuilderServerRoute({
    endpoint: 'POST /internal/observability_agent_builder/ai_insights/error',
    options: {
      access: 'internal',
    },
    security: {
      authz: {
        requiredPrivileges: [apiPrivileges.readAgentBuilder],
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
    handler: async ({ request, core, plugins, dataRegistry, params, response, logger }) => {
      const { errorId, serviceName, start, end, environment = '' } = params.body;

      const [, startDeps] = await core.getStartServices();
      const { inference } = startDeps;

      const { connectorId, connector } = await resolveConnectorForFeature({
        searchInferenceEndpoints: startDeps.searchInferenceEndpoints,
        featureId: OBSERVABILITY_AI_INSIGHTS_SUBFEATURE_ID,
        request,
        logger,
      });

      const inferenceClient = inference.getClient({ request, bindTo: { connectorId } });

      const result = await generateErrorAiInsight({
        core,
        plugins,
        errorId,
        serviceName,
        start,
        end,
        environment,
        connector,
        dataRegistry,
        request,
        inferenceClient,
        logger,
      });

      return response.ok({
        body: observableIntoEventSourceStream(result.events$, {
          logger,
          signal: getRequestAbortedSignal(request),
        }),
      });
    },
  });

  const logAiInsightsRoute = createObservabilityAgentBuilderServerRoute({
    endpoint: 'POST /internal/observability_agent_builder/ai_insights/log',
    options: {
      access: 'internal',
    },
    security: {
      authz: {
        requiredPrivileges: [apiPrivileges.readAgentBuilder],
      },
    },
    params: t.type({
      body: t.partial({
        index: t.string,
        id: t.string,
        fields: t.record(t.string, t.unknown),
      }),
    }),
    handler: async ({ request, core, params, response, logger, plugins }) => {
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

      const { connectorId, connector } = await resolveConnectorForFeature({
        searchInferenceEndpoints: startDeps.searchInferenceEndpoints,
        featureId: OBSERVABILITY_AI_INSIGHTS_SUBFEATURE_ID,
        request,
        logger,
      });

      const inferenceClient = inference.getClient({ request });
      const esClient = coreStart.elasticsearch.client.asScoped(request);

      const result = await getLogAiInsights({
        core,
        plugins,
        index,
        id,
        fields,
        inferenceClient,
        connectorId,
        connector,
        request,
        esClient,
        logger,
      });

      return response.ok({
        body: observableIntoEventSourceStream(result.events$, {
          logger,
          signal: getRequestAbortedSignal(request),
        }),
      });
    },
  });

  return {
    ...logAiInsightsRoute,
    ...errorAiInsightsRoute,
    ...getAlertAiInsightRoute,
  };
}
