/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import moment from 'moment/moment';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import type { Replacements } from '@kbn/elastic-assistant-common';
import {
  ExplainRiskScoreRouteRequestBody,
  API_VERSIONS,
  ExplainRiskScoreRouteResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { buildResponse } from '../../lib/build_response';
import type { ElasticAssistantRequestHandlerContext } from '../../types';
import { getLlmType } from '../utils';
import { getExplainRiskScoreGraph } from '../../lib/risk_score/graphs/explain_risk_score_graph';

// const ROUTE_HANDLER_TIMEOUT = 10 * 60 * 1000; // 10 * 60 seconds = 10 minutes
// const LANG_CHAIN_TIMEOUT = ROUTE_HANDLER_TIMEOUT - 10_000; // 9 minutes 50 seconds
// const CONNECTOR_TIMEOUT = LANG_CHAIN_TIMEOUT - 10_000; // 9 minutes 40 seconds

export const explainRiskScoreRoute = (router: IRouter<ElasticAssistantRequestHandlerContext>) => {
  router.versioned
    .post({
      access: 'internal',
      path: '/internal/elastic_assistant/risk_score/explain',
      security: {
        authz: {
          requiredPrivileges: ['elasticAssistant'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(ExplainRiskScoreRouteRequestBody),
          },
          response: {
            200: {
              body: { custom: buildRouteValidationWithZod(ExplainRiskScoreRouteResponse) },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<ExplainRiskScoreRouteResponse>> => {
        const startTime = moment(); // start timing the generation
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;

        try {
          const authenticatedUser = assistantContext.getCurrentUser();
          if (authenticatedUser == null) {
            return resp.error({
              body: `Authenticated user not found`,
              statusCode: 401,
            });
          }

          const {
            apiConfig,
            langSmithApiKey,
            langSmithProject,
            identifier,
            identifierKey,
            replacements,
            size,
            start,
            end,
            anonymizationFields,
            alertsIndexPattern,
          } = request.body;

          if (!identifier || !identifierKey) {
            return resp.error({
              body: `Identifier and identifierKey are required`,
              statusCode: 400,
            });
          }

          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          const traceOptions = {
            projectName: langSmithProject,
            tracers: [
              ...getLangSmithTracer({
                apiKey: langSmithApiKey,
                projectName: langSmithProject,
                logger,
              }),
            ],
          };

          // Old LLM client
          const llmType = getLlmType(apiConfig.actionTypeId);
          const model = apiConfig.model;
          // const llm = new ActionsClientLlm({
          //   actionsClient,
          //   connectorId: apiConfig.connectorId,
          //   llmType,
          //   logger,
          //   model,
          //   temperature: 0, // zero temperature for attack discovery, because we want structured JSON output
          //   timeout: CONNECTOR_TIMEOUT,
          //   traceOptions,
          //   telemetryMetadata: {
          //     pluginId: 'security_explain_risk_score',
          //   },
          // });

          const llm = await assistantContext.inference.getChatModel({
            request,
            connectorId: apiConfig.connectorId,
            chatModelOptions: {
              model,
              // signal: abortSignal, TODO
              temperature: 0, // zero temperature for attack discovery, because we want structured JSON output
              // prevents the agent from retrying on failure
              // failure could be due to bad connector, we should deliver that result to the client asap
              maxRetries: 0,
              metadata: {
                connectorTelemetry: {
                  pluginId: 'security_explain_risk_score',
                },
              },
              // TODO add timeout to inference once resolved https://github.com/elastic/kibana/issues/221318
              // timeout,
            },
          });

          if (llm == null) {
            throw new Error('LLM is required for attack discoveries');
          }

          let latestReplacements: Replacements = { ...replacements };
          const onNewReplacements = (newReplacements: Replacements) => {
            latestReplacements = { ...latestReplacements, ...newReplacements };
          };

          const graph = getExplainRiskScoreGraph({
            alertsIndexPattern,
            anonymizationFields,
            end,
            esClient,
            llm,
            logger,
            onNewReplacements,
            replacements: latestReplacements,
            size,
            start,
            identifier,
            identifierKey,
          });

          logger?.debug(() => 'Invoking ExplainRiskScore graph');

          const result = await graph.invoke(
            {},
            {
              callbacks: [...(traceOptions?.tracers ?? [])],
              runName: 'risk_score_explanation',
              tags: ['explain-risk-score', llmType, model].flatMap((tag) => tag ?? []),
            }
          );

          if (!result) {
            return resp.error({
              body: `Entity resolution tool failed to generate`,
              statusCode: 500,
            });
          }

          const endTime = moment(); // end timing the generation

          logger.info(
            `Entity resolution tool took ${endTime.diff(startTime, 'seconds')} seconds to generate`
          );

          return response.ok({
            body: {
              summary: result.insight?.summary ?? '',
              detailedExplanation: result.insight?.detailedExplanation ?? '',
              recommendations: result.insight?.recommendations ?? '',
              replacements: result.replacements,
            },
          });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);

          return resp.error({
            body: { success: false, error: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
