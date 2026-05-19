/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { KibanaRequest } from '@kbn/core/server';
import type { KibanaResponseFactory } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import { i18n } from '@kbn/i18n';
import { throwError } from 'rxjs';
import { ServerSentEventError } from '@kbn/sse-utils';
import { ServerSentEventErrorCode } from '@kbn/sse-utils/src/errors';
import type { ServerRouteRepository } from '@kbn/server-route-repository-utils';
import { apiPrivileges } from '@kbn/agent-builder-plugin/common/features';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
import { getRequestAbortedSignal } from '@kbn/inference-plugin/server/routes/get_request_aborted_signal';
import { isIndexNotFoundError } from '@kbn/agent-builder-plugin/server/utils/is_index_not_found_error';
import { isNoMatchingProjectError } from '@kbn/agent-builder-plugin/server/utils/is_no_matching_project_error';
import { getSSEResponseHeaders } from '@kbn/agent-builder-plugin/server/routes/utils';
import { generateErrorAiInsight } from './apm_error/generate_error_ai_insight';
import { createObservabilityAgentBuilderServerRoute } from '../create_observability_agent_builder_server_route';
import { getLogAiInsights } from './get_log_ai_insights';
import {
  getAlertAiInsight,
  type AlertDocForInsight,
} from './alert_ai_insights/generate_alert_ai_insight';
import { OBSERVABILITY_AI_INSIGHTS_SUBFEATURE_ID } from '../../../common/constants';
import { resolveConnectorForFeature } from '../../utils/resolve_connector_for_feature';

function getRawErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function aiInsightSseErrorResponse({
  response,
  message,
  retryable,
  isCloudEnabled,
  logger,
  request,
}: {
  response: KibanaResponseFactory;
  message: string;
  retryable: boolean;
  isCloudEnabled: boolean;
  logger: Pick<Logger, 'debug' | 'error'>;
  request: KibanaRequest;
}) {
  const err$ = throwError(
    () =>
      new ServerSentEventError(ServerSentEventErrorCode.internalError, message, {
        retryable,
      })
  );
  return response.ok({
    headers: getSSEResponseHeaders(isCloudEnabled),
    body: observableIntoEventSourceStream(err$, {
      logger,
      signal: getRequestAbortedSignal(request),
    }),
  });
}

function routeAiInsightError({
  error,
  response,
  isCloudEnabled,
  logger,
  request,
}: {
  error: unknown;
  response: KibanaResponseFactory;
  isCloudEnabled: boolean;
  logger: Pick<Logger, 'debug' | 'error'>;
  request: KibanaRequest;
}) {
  if (isNoMatchingProjectError(error)) {
    return aiInsightSseErrorResponse({
      response,
      message: i18n.translate('xpack.observabilityAgentBuilder.aiInsight.error.noMatchingProject', {
        defaultMessage: 'AI insights are not supported for data from linked projects.',
      }),
      retryable: false,
      isCloudEnabled,
      logger,
      request,
    });
  }
  if (isIndexNotFoundError(error)) {
    return aiInsightSseErrorResponse({
      response,
      message: i18n.translate('xpack.observabilityAgentBuilder.aiInsight.error.indexUnavailable', {
        defaultMessage: 'The source index for this data is unavailable.',
      }),
      retryable: false,
      isCloudEnabled,
      logger,
      request,
    });
  }
  return aiInsightSseErrorResponse({
    response,
    message: getRawErrorMessage(error),
    retryable: true,
    isCloudEnabled,
    logger,
    request,
  });
}

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
      const isCloudEnabled = Boolean(plugins.cloud?.isCloudEnabled);
      const [, startDeps] = await core.getStartServices();
      const { inference, ruleRegistry, searchInferenceEndpoints } = startDeps;

      try {
        const { connectorId, connector } = await resolveConnectorForFeature({
          searchInferenceEndpoints,
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
          headers: getSSEResponseHeaders(isCloudEnabled),
          body: observableIntoEventSourceStream(result.events$, {
            logger,
            signal: getRequestAbortedSignal(request),
          }),
        });
      } catch (error) {
        logger.error(error);
        return routeAiInsightError({
          error,
          response,
          isCloudEnabled,
          logger,
          request,
        });
      }
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
      const isCloudEnabled = Boolean(plugins.cloud?.isCloudEnabled);

      const [, startDeps] = await core.getStartServices();
      const { inference, searchInferenceEndpoints } = startDeps;

      try {
        const { connectorId, connector } = await resolveConnectorForFeature({
          searchInferenceEndpoints,
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
          headers: getSSEResponseHeaders(isCloudEnabled),
          body: observableIntoEventSourceStream(result.events$, {
            logger,
            signal: getRequestAbortedSignal(request),
          }),
        });
      } catch (error) {
        logger.error(error);
        return routeAiInsightError({
          error,
          response,
          isCloudEnabled,
          logger,
          request,
        });
      }
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
      const isCloudEnabled = Boolean(plugins.cloud?.isCloudEnabled);

      const hasDocIdentity = typeof index === 'string' && typeof id === 'string';
      // if a user is in ESQL mode, there is currently no id or index metadata
      // unless a user specifically queries for it, so pass fields directly
      const hasFields = fields && Object.keys(fields).length > 0;

      if (!hasDocIdentity && !hasFields) {
        return response.badRequest({
          body: 'Must provide either {index, id} or {fields}',
        });
      }

      try {
        const [coreStart, startDeps] = await core.getStartServices();
        const { inference, searchInferenceEndpoints } = startDeps;

        const { connectorId, connector } = await resolveConnectorForFeature({
          searchInferenceEndpoints,
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
          headers: getSSEResponseHeaders(isCloudEnabled),
          body: observableIntoEventSourceStream(result.events$, {
            logger,
            signal: getRequestAbortedSignal(request),
          }),
        });
      } catch (error) {
        logger.error(error);
        return routeAiInsightError({
          error,
          response,
          isCloudEnabled,
          logger,
          request,
        });
      }
    },
  });

  return {
    ...logAiInsightsRoute,
    ...errorAiInsightsRoute,
    ...getAlertAiInsightRoute,
  };
}
