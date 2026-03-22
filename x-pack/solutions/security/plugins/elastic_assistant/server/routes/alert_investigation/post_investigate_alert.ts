/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { z } from '@kbn/zod';

import { buildResponse } from '../../lib/build_response';
import type { ElasticAssistantRequestHandlerContext } from '../../types';
import { executeInvestigation } from '../../lib/alert_investigation';
import { getLlmClient } from '../../lib/alert_investigation/helpers';
import type { ConfigSchema } from '../../config_schema';
import { performChecks } from '../helpers';

const ROUTE_TIMEOUT = 2 * 60 * 1000; // 2 minutes (enough for 2 agents)

/**
 * Request body schema
 */
const PostInvestigateAlertRequestBody = z.object({
  alertId: z.string().describe('Alert ID to investigate'),
  alertIndex: z.string().describe('Index where alert is stored'),
  caseId: z.string().optional().describe('Optional case ID to attach investigation to'),
  connectorId: z.string().describe('Connector ID for LLM'),
});

type PostInvestigateAlertRequestBodyInput = z.input<typeof PostInvestigateAlertRequestBody>;

/**
 * Response schema
 */
const PostInvestigateAlertResponse = z.object({
  alertId: z.string(),
  caseId: z.string().optional(),
  timestamp: z.string(),
  triage: z
    .object({
      classification: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
      attackType: z.string(),
      confidence: z.number(),
      reasoning: z.string(),
    })
    .optional(),
  mitreMapping: z
    .object({
      techniques: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
        })
      ),
      tactics: z.array(z.object({ id: z.string(), name: z.string() })),
      phase: z.string(),
      confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
      reasoning: z.string(),
    })
    .optional(),
  investigationText: z.string(),
  latencyMs: z.number(),
});

type PostInvestigateAlertResponseOutput = z.output<typeof PostInvestigateAlertResponse>;

const ALERT_INVESTIGATION_PATH = '/internal/elastic_assistant/alert_investigation';

/**
 * POST /internal/elastic_assistant/alert_investigation
 *
 * Execute AI-powered investigation for a security alert
 *
 * Foundation Spike: 2 agents (Triage + MITRE Mapper)
 */
export const postInvestigateAlertRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>,
  config: ConfigSchema
) => {
  router.versioned
    .post({
      access: 'internal',
      path: ALERT_INVESTIGATION_PATH,
      options: {
        timeout: {
          idleSocket: ROUTE_TIMEOUT,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(PostInvestigateAlertRequestBody),
          },
          response: {
            200: {
              body: { custom: buildRouteValidationWithZod(PostInvestigateAlertResponse) },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<PostInvestigateAlertResponseOutput>> => {
        const resp = buildResponse(response);

        // Check if feature is enabled
        if (!config.llmInvestigationEnabled) {
          return resp.error({
            body: 'LLM-powered investigation is not enabled. Set xpack.elasticAssistant.llmInvestigationEnabled: true in kibana.yml',
            statusCode: 403,
          });
        }

        const performChecksContext = await context.resolve([
          'core',
          'elasticAssistant',
          'licensing',
        ]);

        const checkResponse = await performChecks({
          context: performChecksContext,
          request,
          response,
        });

        if (!checkResponse.isSuccess) {
          return checkResponse.response;
        }

        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;

        try {
          const { alertId, alertIndex, caseId, connectorId, enabledAgents } = request.body;

          // Get ES client
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          // Fetch the alert
          logger.info(`[Alert Investigation] Fetching alert ${alertId} from ${alertIndex}`);

          const alertResponse = await esClient.get({
            index: alertIndex,
            id: alertId,
          });

          if (!alertResponse.found) {
            return resp.error({
              body: `Alert ${alertId} not found in index ${alertIndex}`,
              statusCode: 404,
            });
          }

          const alert = {
            _id: alertResponse._id,
            _index: alertResponse._index,
            _source: alertResponse._source,
          };

          // Get actions client
          const actions = assistantContext.actions;
          const actionsClient = await actions.getActionsClientWithRequest(request);

          // Get LLM client
          const llmClient = await getLlmClient({
            actionsClient,
            connectorId,
            connectorTimeout: config.responseTimeout,
            langSmithApiKey: process.env.LANGSMITH_API_KEY,
            logger,
          });

          // Execute investigation
          logger.info(
            `[Alert Investigation] Starting investigation for alert ${alertId}${caseId ? ` (case: ${caseId})` : ''}`
          );

          const investigation = await executeInvestigation({
            alert,
            caseId,
            llmClient,
            esClient,
            logger,
            enabledAgents,
          });

          logger.info(
            `[Alert Investigation] Completed in ${investigation.latencyMs}ms - ${investigation.triage?.classification}`
          );

          return response.ok({
            body: investigation,
          });
        } catch (error) {
          logger.error(`[Alert Investigation] Failed: ${error.message}`);

          const err = transformError(error);
          return resp.error({
            body: err.message,
            statusCode: err.statusCode,
          });
        }
      }
    );
};
