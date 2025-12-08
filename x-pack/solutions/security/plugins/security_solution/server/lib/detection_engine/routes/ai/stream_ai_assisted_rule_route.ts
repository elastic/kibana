/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { Logger } from '@kbn/core/server';
import { streamFactory } from '@kbn/ml-response-stream/server';

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { INTERNAL_DETECTION_ENGINE_URL } from '../../../../../common/constants';

import { streamRuleCreation } from '../../ai_assisted_rule_creation/iterative_agent/stream_rule_creation';
import { getIterativeRuleCreationAgent } from '../../ai_assisted_rule_creation/iterative_agent';
import { buildSiemResponse } from '../utils';
import { AIAssistedCreateRuleRequestBody } from '../../../../../common/api/detection_engine/ai_assisted/index.gen';

export const streamAiAssistedRuleRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .post({
      access: 'internal',
      path: `${INTERNAL_DETECTION_ENGINE_URL}/ai_assisted/_stream`,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: {
        timeout: {
          idleSocket: 300000, // 5 minutes
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(AIAssistedCreateRuleRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        const {
          end: streamEnd,
          push,
          responseWithHeaders,
        } = streamFactory<{ type: string; payload: string }>(request.headers, logger, false, false);

        try {
          const { user_query: userQuery, connector_id: connectorId } = request.body;

          const ctx = await context.resolve(['securitySolution', 'alerting']);
          const inferenceService = ctx.securitySolution.getInferenceService();

          const core = await context.core;
          const esClient = core.elasticsearch.client.asCurrentUser;
          const savedObjectsClient = core.savedObjects.client;
          const rulesClient = await ctx.alerting.getRulesClient();
          const kbDataClient = await ctx.securitySolution.getAIAssistantKnowledgeBaseDataClient();

          const abortController = new AbortController();
          request.events.completed$.subscribe((e) => {
            abortController.abort();
          });

          const createLlmInstance = async () => {
            if (!inferenceService || !connectorId) {
              throw new Error('Inference service or connector ID is not available');
            }
            return inferenceService.getChatModel({
              request,
              connectorId,
              chatModelOptions: {
                // not passing specific `model`, we'll always use the connector default model
                // temperature may need to be parametrized in the future
                temperature: 0.05,
                // Only retry once inside the model call, we already handle backoff retries in the task runner for the entire task
                maxRetries: 1,
                // Disable streaming explicitly
                disableStreaming: true,
                // Set a hard limit of 50 concurrent requests
                maxConcurrency: 50,
                signal: abortController.signal,
              },
            });
          };

          const model = await createLlmInstance();

          // Create the rule creation agent
          const graph = await getIterativeRuleCreationAgent({
            model,
            logger,
            inference: inferenceService,
            createLlmInstance,
            connectorId,
            request,
            esClient,
            savedObjectsClient,
            rulesClient,
          });
          /*
          const mockedStream = `{\"type\":\"node_update\",\"nodeState\":{\"userQuery\":\"get me top 10 network events with response size greater than 100Kb\\n\",\"errors\":[]},\"nodeName\":\"processKnowledgeBase\",\"timestamp\":\"2025-11-05T09:58:46.065Z\"}
              {\"type\":\"node_update\",\"nodeState\":{\"userQuery\":\"get me top 10 network events with response size greater than 100Kb\\n\",\"errors\":[],\"indices\":{\"shortlistedIndexPatterns\":[\"packetbeat-8.14.2\",\"logs-*\",\"auditbeat-8.11.1\"]}},\"nodeName\":\"getIndexPattern\",\"timestamp\":\"2025-11-05T09:58:48.485Z\"}
              {\"type\":\"node_update\",\"nodeState\":{\"userQuery\":\"get me top 10 network events with response size greater than 100Kb\\n\",\"rule\":{\"query\":\"FROM packetbeat-8.14.2 METADATA _id,_index,_version\\n| WHERE http.response.bytes > 102400\\n| SORT http.response.bytes DESC\\n| LIMIT 10\",\"language\":\"esql\",\"type\":\"esql\"},\"errors\":[],\"indices\":{\"shortlistedIndexPatterns\":[\"packetbeat-8.14.2\",\"logs-*\",\"auditbeat-8.11.1\"]},\"validationErrors\":{}},\"nodeName\":\"esqlQueryCreation\",\"timestamp\":\"2025-11-05T09:58:54.103Z\"}
              {\"type\":\"node_update\",\"nodeState\":{\"userQuery\":\"get me top 10 network events with response size greater than 100Kb\\n\",\"rule\":{\"query\":\"FROM packetbeat-8.14.2 METADATA _id,_index,_version\\n| WHERE http.response.bytes > 102400\\n| SORT http.response.bytes DESC\\n| LIMIT 10\",\"language\":\"esql\",\"type\":\"esql\",\"tags\":[\"Domain: Network\",\"Use Case: Network Security Monitoring\",\"Data Source: Network\",\"Data Source: Network Traffic\",\"Data Source: Network Traffic HTTP Logs\",\"packetbeat\",\"Tactic: Exfiltration\",\"AI assisted rule creation\"]},\"errors\":[],\"indices\":{\"shortlistedIndexPatterns\":[\"packetbeat-8.14.2\",\"logs-*\",\"auditbeat-8.11.1\"]},\"validationErrors\":{}},\"nodeName\":\"getTags\",\"timestamp\":\"2025-11-05T09:58:57.575Z\"}
              {\"type\":\"node_update\",\"nodeState\":{\"userQuery\":\"get me top 10 network events with response size greater than 100Kb\\n\",\"rule\":{\"query\":\"FROM packetbeat-8.14.2 METADATA _id,_index,_version\\n| WHERE http.response.bytes > 102400\\n| SORT http.response.bytes DESC\\n| LIMIT 10\",\"language\":\"esql\",\"type\":\"esql\",\"tags\":[\"Domain: Network\",\"Use Case: Network Security Monitoring\",\"Data Source: Network\",\"Data Source: Network Traffic\",\"Data Source: Network Traffic HTTP Logs\",\"packetbeat\",\"Tactic: Exfiltration\",\"AI assisted rule creation\"],\"name\":\"Top 10 Large HTTP Response Events\",\"description\":\"Identifies the top 10 network events with HTTP response sizes exceeding 100KB, which may indicate large data transfers.\"},\"errors\":[],\"indices\":{\"shortlistedIndexPatterns\":[\"packetbeat-8.14.2\",\"logs-*\",\"auditbeat-8.11.1\"]},\"validationErrors\":{}},\"nodeName\":\"createRuleNameAndDescription\",\"timestamp\":\"2025-11-05T09:58:58.730Z\"}
              {\"type\":\"node_update\",\"nodeState\":{\"userQuery\":\"get me top 10 network events with response size greater than 100Kb\\n\",\"rule\":{\"query\":\"FROM packetbeat-8.14.2 METADATA _id,_index,_version\\n| WHERE http.response.bytes > 102400\\n| SORT http.response.bytes DESC\\n| LIMIT 10\",\"language\":\"esql\",\"type\":\"esql\",\"tags\":[\"Domain: Network\",\"Use Case: Network Security Monitoring\",\"Data Source: Network\",\"Data Source: Network Traffic\",\"Data Source: Network Traffic HTTP Logs\",\"packetbeat\",\"Tactic: Exfiltration\",\"AI assisted rule creation\"],\"name\":\"Top 10 Large HTTP Response Events\",\"description\":\"Identifies the top 10 network events with HTTP response sizes exceeding 100KB, which may indicate large data transfers.\",\"interval\":\"5m\",\"from\":\"now-6m\",\"to\":\"now\"},\"errors\":[],\"indices\":{\"shortlistedIndexPatterns\":[\"packetbeat-8.14.2\",\"logs-*\",\"auditbeat-8.11.1\"]},\"validationErrors\":{}},\"nodeName\":\"addSchedule\",\"timestamp\":\"2025-11-05T09:59:00.834Z\"}
              {\"type\":\"node_update\",\"nodeState\":{\"userQuery\":\"get me top 10 network events with response size greater than 100Kb\\n\",\"rule\":{\"query\":\"FROM packetbeat-8.14.2 METADATA _id,_index,_version\\n| WHERE http.response.bytes > 102400\\n| SORT http.response.bytes DESC\\n| LIMIT 10\",\"language\":\"esql\",\"type\":\"esql\",\"tags\":[\"Domain: Network\",\"Use Case: Network Security Monitoring\",\"Data Source: Network\",\"Data Source: Network Traffic\",\"Data Source: Network Traffic HTTP Logs\",\"packetbeat\",\"Tactic: Exfiltration\",\"AI assisted rule creation\"],\"name\":\"Top 10 Large HTTP Response Events\",\"description\":\"Identifies the top 10 network events with HTTP response sizes exceeding 100KB, which may indicate large data transfers.\",\"interval\":\"5m\",\"from\":\"now-6m\",\"to\":\"now\",\"references\":[],\"severity_mapping\":[],\"risk_score_mapping\":[],\"related_integrations\":[],\"required_fields\":[],\"actions\":[],\"exceptions_list\":[],\"false_positives\":[],\"threat\":[],\"author\":[],\"setup\":\"\",\"max_signals\":100,\"risk_score\":47,\"severity\":\"medium\"},\"errors\":[],\"indices\":{\"shortlistedIndexPatterns\":[\"packetbeat-8.14.2\",\"logs-*\",\"auditbeat-8.11.1\"]},\"validationErrors\":{}},\"nodeName\":\"addDefaultFieldsToRules\",\"timestamp\":\"2025-11-05T09:59:00.837Z\"}`;
          const mockedStreamLines = mockedStream.split('\n');
          //   console.log('mockedStreamLines:', mockedStreamLines);

          const pushToStreamMOck = async () => {
            for (const line of mockedStreamLines) {
              // console.log('mocked stream line:', JSON.parse(line).payload);
              await new Promise((resolve) => setTimeout(resolve, 3000)); // simulate delay
              push({ payload: line, type: 'state_update' });
            }
            streamEnd();
          };
          pushToStreamMOck()
            .catch((error) => {
              logger.error(`Error during streaming rule creation: ${error.message}`);
              streamEnd();
            })
            .finally(() => {});
*/
          const pushToStream = async () => {
            for await (const event of streamRuleCreation(
              graph,
              { userQuery, errors: [] },
              { signal: abortController.signal }
            )) {
              if (event != null) {
                push({ payload: JSON.stringify(event), type: 'state_update' });
              }
            }
            streamEnd();
          };

          pushToStream().catch((error) => {
            logger.error(`Error during streaming rule creation: ${error.message}`);
            streamEnd();
          });

          return response.ok(responseWithHeaders);
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
