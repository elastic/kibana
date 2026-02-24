/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, IKibanaResponse, Logger } from '@kbn/core/server';
import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { API_VERSIONS } from '@kbn/elastic-assistant-common';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';
import { transformError } from '@kbn/securitysolution-es-utils';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';

import { buildResponse } from '../../../lib/build_response';
import type { ElasticAssistantRequestHandlerContext } from '../../../types';
import { WorkflowDataClient, AlertGroupingWorkflowExecutor } from '../../../lib/alert_grouping';
import {
  createCase,
  attachAlertsToCase,
  fetchOpenSecurityCases,
  detachAlertsFromCase,
  addCommentToCase,
  type CasesClientLike,
} from '../../../lib/alert_grouping/helpers';
import { performChecks } from '../../helpers';
import { ALERT_GROUPING_WORKFLOW_BY_ID } from './crud_routes';
import { generateAttackDiscoveries } from '../../attack_discovery/helpers/generate_discoveries';
import { getDefaultAnonymizationFields } from '../../../../common/anonymization';

const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

/**
 * Gets the default connector ID from UI settings
 */
async function getDefaultConnectorId(
  context: ElasticAssistantRequestHandlerContext,
  logger: Logger
): Promise<string | undefined> {
  try {
    const coreContext = await context.core;
    const soClient = coreContext.savedObjects.client;
    const uiSettingsClient = coreContext.uiSettings.client;

    const defaultConnectorSetting = await uiSettingsClient.get<string | undefined>(
      GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR
    );

    const hasValidDefaultConnector =
      defaultConnectorSetting && defaultConnectorSetting !== NO_DEFAULT_CONNECTOR;

    if (hasValidDefaultConnector) {
      logger.debug(`Using default AI connector from UI setting: ${defaultConnectorSetting}`);
      return defaultConnectorSetting;
    }

    logger.debug('No default AI connector configured in UI settings');
    return undefined;
  } catch (error) {
    logger.error(
      `Failed to get default connector: ${error instanceof Error ? error.message : String(error)}`
    );
    return undefined;
  }
}

// Route paths
const WORKFLOW_RUN = `${ALERT_GROUPING_WORKFLOW_BY_ID}/_run`;
const WORKFLOW_EXECUTIONS = `${ALERT_GROUPING_WORKFLOW_BY_ID}/executions`;
const WORKFLOW_EXECUTION_BY_ID = `${ALERT_GROUPING_WORKFLOW_BY_ID}/executions/{execution_id}`;
const WORKFLOW_EXECUTION_CANCEL = `${WORKFLOW_EXECUTION_BY_ID}/_cancel`;

// Request schemas
const WorkflowIdParamsSchema = z.object({
  workflow_id: z.string().uuid(),
});

const ExecutionIdParamsSchema = z.object({
  workflow_id: z.string().uuid(),
  execution_id: z.string().uuid(),
});

const RunWorkflowRequestSchema = z.object({
  dry_run: z.boolean().optional(),
  max_alerts: z.number().optional(),
  time_range: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
  exclude_tags: z.array(z.string()).optional(),
  include_statuses: z.array(z.enum(['open', 'acknowledged', 'closed'])).optional(),
  skip_attack_discovery: z.boolean().optional(),
  /** Enable validation of alert relevance using Attack Discovery results */
  validate_alert_relevance: z.boolean().optional(),
  /** Enable case merging based on Attack Discovery similarity analysis */
  enable_case_merging: z.boolean().optional(),
  /** Connector ID to use for Attack Discovery */
  connector_id: z.string().optional(),
  /** Enable host-primary grouping (Tier 1) */
  host_primary_grouping: z.boolean().optional(),
  /** Temporal clustering gap threshold in minutes (Tier 2) */
  temporal_gap_minutes: z.number().optional(),
  /** Enable LLM cluster classification (Tier 4) */
  enable_llm_classification: z.boolean().optional(),
  /** Enable AD feedback loop (Tier 4) */
  enable_ad_feedback: z.boolean().optional(),
});

const FindExecutionsQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  per_page: z.coerce.number().min(1).max(100).optional(),
  status: z.enum(['running', 'completed', 'failed', 'cancelled']).optional(),
  start: z.string().optional(),
  end: z.string().optional(),
});

/**
 * Register workflow execution routes
 */
export const registerWorkflowExecutionRoutes = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
) => {
  // Manual trigger workflow
  router.versioned
    .post({
      access: 'public',
      path: WORKFLOW_RUN,
      security: {
        authz: {
          requiredPrivileges: [ATTACK_DISCOVERY_API_ACTION_ALL],
        },
      },
      options: {
        timeout: {
          idleSocket: 10 * 60 * 1000, // 10 minutes
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(WorkflowIdParamsSchema),
            body: buildRouteValidationWithZod(RunWorkflowRequestSchema),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse> => {
        const performChecksContext = await context.resolve([
          'core',
          'elasticAssistant',
          'licensing',
        ]);
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;

        const checkResponse = await performChecks({
          context: performChecksContext,
          request,
          response,
        });

        if (!checkResponse.isSuccess) {
          return checkResponse.response;
        }

        try {
          const authenticatedUser = await assistantContext.getCurrentUser();
          if (!authenticatedUser) {
            return resp.error({ body: 'Authenticated user not found', statusCode: 401 });
          }

          const spaceId = assistantContext.getSpaceId();
          const soClient = (await context.core).savedObjects.client;
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          const dataClient = new WorkflowDataClient({
            logger,
            soClient,
            spaceId,
            currentUser: authenticatedUser.username,
          });

          // Get workflow configuration
          const workflow = await dataClient.getWorkflow(request.params.workflow_id);
          if (!workflow) {
            return resp.error({ body: 'Workflow not found', statusCode: 404 });
          }

          // Create execution record
          const execution = await dataClient.createExecution(
            workflow.id!,
            'manual',
            request.body.dry_run ?? false
          );

          // Apply overrides
          const config = { ...workflow };
          if (request.body.max_alerts !== undefined) {
            config.alertFilter = {
              ...config.alertFilter,
              maxAlertsPerRun: request.body.max_alerts,
            };
          }
          if (request.body.time_range) {
            config.alertFilter = {
              ...config.alertFilter,
              timeRange: request.body.time_range,
            };
          }
          if (request.body.exclude_tags !== undefined) {
            config.alertFilter = {
              ...config.alertFilter,
              excludeTags: request.body.exclude_tags,
            };
          }
          if (request.body.include_statuses !== undefined) {
            config.alertFilter = {
              ...config.alertFilter,
              includeStatuses: request.body.include_statuses,
            };
          }
          if (request.body.skip_attack_discovery) {
            config.attackDiscoveryConfig = {
              ...config.attackDiscoveryConfig,
              enabled: false,
            };
          }
          if (request.body.validate_alert_relevance !== undefined) {
            config.attackDiscoveryConfig = {
              ...config.attackDiscoveryConfig,
              validateAlertRelevance: request.body.validate_alert_relevance,
            };
          }
          if (request.body.enable_case_merging !== undefined) {
            config.attackDiscoveryConfig = {
              ...config.attackDiscoveryConfig,
              enableCaseMerging: request.body.enable_case_merging,
            };
          }
          if (request.body.connector_id) {
            config.apiConfig = {
              ...config.apiConfig,
              connectorId: request.body.connector_id,
              actionTypeId: config.apiConfig?.actionTypeId ?? '.bedrock',
            };
          }
          // Apply Tier 1-4 overrides
          if (request.body.host_primary_grouping !== undefined) {
            config.groupingConfig = {
              ...config.groupingConfig,
              hostPrimaryGrouping: request.body.host_primary_grouping,
            };
          }
          if (request.body.temporal_gap_minutes !== undefined) {
            config.groupingConfig = {
              ...config.groupingConfig,
              temporalClustering: {
                ...config.groupingConfig.temporalClustering,
                enabled: true,
                gapThresholdMinutes: request.body.temporal_gap_minutes,
              },
            };
          }
          if (request.body.enable_llm_classification !== undefined) {
            config.groupingConfig = {
              ...config.groupingConfig,
              llmClassification: {
                ...config.groupingConfig.llmClassification,
                enabled: request.body.enable_llm_classification,
              },
            };
          }
          if (request.body.enable_ad_feedback !== undefined) {
            config.groupingConfig = {
              ...config.groupingConfig,
              llmClassification: {
                ...config.groupingConfig.llmClassification,
                adFeedbackLoop: request.body.enable_ad_feedback,
              },
            };
          }

          // Get cases client for actual case operations
          const casesPlugin = assistantContext.getCases();
          const casesClient = casesPlugin
            ? await casesPlugin.getCasesClientWithRequest(request)
            : undefined;

          // Get actions client for Attack Discovery
          const actionsClient = await assistantContext.actions.getActionsClientWithRequest(request);

          // Execute workflow
          const typedCasesClient = casesClient as unknown as CasesClientLike | undefined;
          const executor = new AlertGroupingWorkflowExecutor(
            config,
            {
              logger,
              esClient,
              getCasesByObservables: async () => {
                if (!typedCasesClient) {
                  logger.warn('Cases client not available');
                  return [];
                }
                return fetchOpenSecurityCases(typedCasesClient, logger);
              },
              createCase: async (params) => {
                if (!typedCasesClient) {
                  throw new Error('Cases client not available');
                }
                return createCase(typedCasesClient, params);
              },
              attachAlertsToCase: async (caseId, alerts) => {
                if (!typedCasesClient) {
                  throw new Error('Cases client not available');
                }
                return attachAlertsToCase(typedCasesClient, caseId, alerts);
              },
              generateAttackDiscoveryForCase: async (caseId, alertIds) => {
                // Check if Attack Discovery is enabled
                const adConfig = config.attackDiscoveryConfig;
                if (!adConfig?.enabled) {
                  logger.debug(
                    `Attack Discovery disabled for case ${caseId}, returning all alerts as relevant`
                  );
                  return {
                    attackDiscoveryId: null,
                    relevantAlertIds: alertIds,
                  };
                }

                // Get connector ID - use configured one or fall back to default from UI settings
                let connectorId = config.apiConfig?.connectorId;
                let actionTypeId = config.apiConfig?.actionTypeId;

                if (!connectorId) {
                  // Try to get default connector from UI settings
                  connectorId = await getDefaultConnectorId(context, logger);
                  if (!connectorId) {
                    logger.debug(
                      `No connector configured and no default connector in UI settings for case ${caseId}, returning all alerts as relevant`
                    );
                    return {
                      attackDiscoveryId: null,
                      relevantAlertIds: alertIds,
                    };
                  }
                }

                // Get connector details to determine action type
                if (!actionTypeId) {
                  try {
                    const connector = await actionsClient.get({ id: connectorId });
                    actionTypeId = connector.actionTypeId;
                    logger.debug(
                      `Using connector ${connectorId} (${connector.name}) with action type ${actionTypeId}`
                    );
                  } catch (error) {
                    logger.error(`Failed to get connector details for ${connectorId}: ${error}`);
                    return {
                      attackDiscoveryId: null,
                      relevantAlertIds: alertIds,
                    };
                  }
                }

                try {
                  logger.info(
                    `Generating Attack Discovery for case ${caseId} with ${alertIds.length} alerts using connector ${connectorId}`
                  );

                  // Get default anonymization fields
                  const anonymizationFields = getDefaultAnonymizationFields(spaceId);

                  // Build filter to only include specific alert IDs
                  const alertFilter = {
                    bool: {
                      must: [{ terms: { _id: alertIds } }],
                    },
                  };

                  // Call Attack Discovery
                  logger.info(
                    `Calling Attack Discovery for case ${caseId} with ${alertIds.length} alerts`
                  );
                  logger.debug(`filter: ${JSON.stringify(alertFilter)}`);

                  const result = await generateAttackDiscoveries({
                    actionsClient,
                    config: {
                      alertsIndexPattern:
                        config.alertFilter?.alertsIndexPattern ?? '.alerts-security.alerts-*',
                      anonymizationFields,
                      apiConfig: {
                        connectorId,
                        actionTypeId,
                        model: config.apiConfig?.model,
                      },
                      filter: alertFilter,
                      size: alertIds.length,
                    },
                    esClient,
                    logger,
                    savedObjectsClient: soClient,
                  });

                  logger.info(
                    `Attack Discovery result for case ${caseId}: ${JSON.stringify({
                      hasResult: !!result,
                      hasDiscoveries: !!result?.attackDiscoveries,
                      discoveriesCount: result?.attackDiscoveries?.length ?? 0,
                      anonymizedAlertsCount: result?.anonymizedAlerts?.length ?? 0,
                    })}`
                  );

                  // Safety check - attackDiscoveries might be undefined or null
                  const discoveries = result?.attackDiscoveries ?? [];
                  if (!Array.isArray(discoveries)) {
                    logger.warn(
                      `Attack Discovery returned non-array for case ${caseId}, returning all alerts as relevant`
                    );
                    return {
                      attackDiscoveryId: null,
                      relevantAlertIds: alertIds,
                    };
                  }

                  // Extract all alert IDs that were referenced in the Attack Discoveries
                  const relevantAlertIds = new Set<string>();
                  for (const discovery of discoveries) {
                    if (discovery?.alertIds && Array.isArray(discovery.alertIds)) {
                      for (const alertId of discovery.alertIds) {
                        relevantAlertIds.add(alertId);
                      }
                    }
                  }

                  logger.info(
                    `Attack Discovery for case ${caseId}: found ${discoveries.length} discoveries, ` +
                      `${relevantAlertIds.size}/${alertIds.length} alerts were relevant`
                  );

                  // If no discoveries were generated, consider all alerts as relevant
                  // (they might still be valid, just not forming a clear attack pattern)
                  if (discoveries.length === 0) {
                    logger.debug(
                      `No Attack Discoveries generated for case ${caseId}, returning all alerts as relevant`
                    );
                    return {
                      attackDiscoveryId: null,
                      relevantAlertIds: alertIds,
                    };
                  }

                  // Return the first discovery ID (for now, we assume one discovery per case)
                  return {
                    attackDiscoveryId: discoveries[0]?.id ?? null,
                    relevantAlertIds: Array.from(relevantAlertIds),
                  };
                } catch (error) {
                  logger.error(`Failed to generate Attack Discovery for case ${caseId}: ${error}`);
                  // On error, return all alerts as relevant to avoid incorrectly removing them
                  return {
                    attackDiscoveryId: null,
                    relevantAlertIds: alertIds,
                  };
                }
              },
              detachAlertsFromCase: async (caseId, alertIds) => {
                if (!typedCasesClient) {
                  throw new Error('Cases client not available');
                }
                return detachAlertsFromCase(typedCasesClient, logger, caseId, alertIds);
              },
              analyzeAttackDiscoverySimilarity: async (adId1, adId2) => {
                const adConfig = config.attackDiscoveryConfig;
                if (!adConfig?.enabled) {
                  logger.debug('Attack Discovery disabled, skipping similarity analysis');
                  return {
                    similarity: 0,
                    shouldMerge: false,
                    reason: 'Attack Discovery disabled',
                  };
                }

                // Get connector ID - use configured one or fall back to default from UI settings
                let similarityConnectorId = config.apiConfig?.connectorId;
                if (!similarityConnectorId) {
                  similarityConnectorId = await getDefaultConnectorId(context, logger);
                  if (!similarityConnectorId) {
                    logger.debug(
                      'No connector configured and no default connector in UI settings, skipping similarity analysis'
                    );
                    return {
                      similarity: 0,
                      shouldMerge: false,
                      reason: 'No connector configured',
                    };
                  }
                }

                try {
                  // Get Attack Discovery data client
                  const adDataClient = await assistantContext.getAttackDiscoveryDataClient();
                  if (!adDataClient) {
                    logger.warn('Attack Discovery data client not available');
                    return {
                      similarity: 0,
                      shouldMerge: false,
                      reason: 'Attack Discovery data client not available',
                    };
                  }

                  // Fetch both Attack Discoveries
                  const authenticatedUser = await assistantContext.getCurrentUser();
                  if (!authenticatedUser) {
                    return {
                      similarity: 0,
                      shouldMerge: false,
                      reason: 'User not authenticated',
                    };
                  }

                  const [ad1Result, ad2Result] = await Promise.all([
                    adDataClient.findAttackDiscoveryAlerts({
                      authenticatedUser,
                      esClient,
                      findAttackDiscoveryAlertsParams: {
                        ids: [adId1],
                        page: 1,
                        perPage: 1,
                      },
                      logger,
                    }),
                    adDataClient.findAttackDiscoveryAlerts({
                      authenticatedUser,
                      esClient,
                      findAttackDiscoveryAlertsParams: {
                        ids: [adId2],
                        page: 1,
                        perPage: 1,
                      },
                      logger,
                    }),
                  ]);

                  const ad1 = ad1Result.data[0];
                  const ad2 = ad2Result.data[0];

                  if (!ad1 || !ad2) {
                    logger.warn(`Could not find Attack Discovery: ad1=${!!ad1}, ad2=${!!ad2}`);
                    return {
                      similarity: 0,
                      shouldMerge: false,
                      reason: 'One or both Attack Discoveries not found',
                    };
                  }

                  // Extract attack discovery details for comparison
                  const ad1Summary =
                    ad1.attackDiscoveries
                      ?.map((d) => `Title: ${d.title}\nSummary: ${d.summaryMarkdown}`)
                      .join('\n\n') ?? 'No attack discoveries';
                  const ad2Summary =
                    ad2.attackDiscoveries
                      ?.map((d) => `Title: ${d.title}\nSummary: ${d.summaryMarkdown}`)
                      .join('\n\n') ?? 'No attack discoveries';

                  // Use LLM to analyze similarity
                  const similarityPrompt = `You are a security analyst comparing two Attack Discovery reports to determine if they describe the same attack or incident.

## Attack Discovery 1:
${ad1Summary}

## Attack Discovery 2:
${ad2Summary}

## Task:
Analyze whether these two Attack Discoveries describe the same attack or incident. Consider:
1. Are the attack techniques similar or the same?
2. Are the affected entities (hosts, users, IPs) overlapping?
3. Is the attack timeline consistent?
4. Do the attack narratives describe the same sequence of events?

Respond with a JSON object containing:
- "similarity": A number between 0 and 1 (0 = completely different attacks, 1 = definitely the same attack)
- "shouldMerge": A boolean indicating if these cases should be merged
- "reason": A brief explanation of your analysis

Only respond with the JSON object, no other text.`;

                  const llmResponse = await actionsClient.execute({
                    actionId: similarityConnectorId,
                    params: {
                      subAction: 'invokeAI',
                      subActionParams: {
                        messages: [
                          {
                            role: 'user',
                            content: similarityPrompt,
                          },
                        ],
                      },
                    },
                  });

                  if (llmResponse.status === 'error') {
                    logger.error(`LLM similarity analysis failed: ${llmResponse.message}`);
                    return {
                      similarity: 0,
                      shouldMerge: false,
                      reason: `LLM analysis failed: ${llmResponse.message}`,
                    };
                  }

                  // Parse LLM response
                  const llmContent = (llmResponse.data as { message?: string })?.message ?? '';
                  try {
                    // Extract JSON from the response (handle potential markdown code blocks)
                    const jsonMatch = llmContent.match(/\{[\s\S]*\}/);
                    if (!jsonMatch) {
                      throw new Error('No JSON found in LLM response');
                    }
                    const parsed = JSON.parse(jsonMatch[0]);
                    const threshold = adConfig.caseMergeSimilarityThreshold ?? 0.7;

                    return {
                      similarity: typeof parsed.similarity === 'number' ? parsed.similarity : 0,
                      shouldMerge: parsed.similarity >= threshold && parsed.shouldMerge === true,
                      reason: parsed.reason ?? 'No reason provided',
                    };
                  } catch (parseError) {
                    logger.warn(`Failed to parse LLM similarity response: ${parseError}`);
                    return {
                      similarity: 0,
                      shouldMerge: false,
                      reason: `Failed to parse LLM response: ${llmContent.slice(0, 200)}`,
                    };
                  }
                } catch (error) {
                  logger.error(`Attack Discovery similarity analysis failed: ${error}`);
                  return {
                    similarity: 0,
                    shouldMerge: false,
                    reason: `Analysis error: ${error}`,
                  };
                }
              },
              mergeCases: async (sourceCaseId, targetCaseId, mergeReason) => {
                if (!typedCasesClient) {
                  throw new Error('Cases client not available');
                }

                const sourceCase = (await typedCasesClient.cases.get({ id: sourceCaseId })) as {
                  version: string;
                  observables?: Array<{ typeKey: string; value: string; description?: string }>;
                };
                const sourceAttachments = await typedCasesClient.attachments.getAll({
                  caseID: sourceCaseId,
                });

                // Move alert attachments to target case
                const alertAttachments = sourceAttachments.filter((a) => a.type === 'alert');
                if (alertAttachments.length > 0) {
                  await typedCasesClient.attachments.bulkCreate({
                    caseId: targetCaseId,
                    attachments: alertAttachments.map((a) => ({
                      type: 'alert' as const,
                      alertId: (a as { alertId: string }).alertId,
                      index: (a as { index: string }).index,
                      rule: { id: null, name: null },
                      owner: 'securitySolution',
                    })),
                  });
                }

                // Copy observables from source to target
                if (sourceCase.observables?.length) {
                  for (const obs of sourceCase.observables) {
                    try {
                      await typedCasesClient.cases.addObservable(targetCaseId, {
                        observable: {
                          typeKey: obs.typeKey,
                          value: obs.value,
                          description: obs.description ?? null,
                        },
                      });
                    } catch (err) {
                      logger.debug(`Could not copy observable: ${err}`);
                    }
                  }
                }

                await addCommentToCase(typedCasesClient, targetCaseId, mergeReason);

                await typedCasesClient.cases.update({
                  cases: [
                    { id: sourceCaseId, version: sourceCase.version, status: 'closed' as const },
                  ],
                });
                await addCommentToCase(
                  typedCasesClient,
                  sourceCaseId,
                  `This case was merged into case "${targetCaseId}". ${mergeReason}`
                );

                logger.info(
                  `Merged case ${sourceCaseId} into ${targetCaseId}: moved ${alertAttachments.length} alerts`
                );
              },
              addCommentToCase: async (caseId, comment) => {
                if (!typedCasesClient) {
                  throw new Error('Cases client not available');
                }
                return addCommentToCase(typedCasesClient, caseId, comment);
              },
              // Tier 4: LLM-based cluster classification
              classifyAlertCluster: config.groupingConfig.llmClassification?.enabled
                ? async (clusterDescription, alertSummaries) => {
                    // Get connector for LLM classification
                    let classifyConnectorId = config.apiConfig?.connectorId;
                    if (!classifyConnectorId) {
                      classifyConnectorId = await getDefaultConnectorId(context, logger);
                    }
                    if (!classifyConnectorId) {
                      return {
                        classification: 'Unknown',
                        description: 'No LLM connector available for classification',
                      };
                    }

                    try {
                      const prompt = [
                        'You are a security analyst classifying a cluster of related security alerts.',
                        'Based on the cluster description and alert summaries below, provide:',
                        '1. A short classification label (e.g., "Ransomware deployment", "C2 beacon", "Credential theft")',
                        '2. A 1-2 sentence description of the attack pattern',
                        '3. If the alerts contain clearly distinct attack operations, suggest how to split them into sub-groups.',
                        '',
                        '## Cluster Description',
                        clusterDescription,
                        '',
                        '## Alert Summaries',
                        ...alertSummaries.map((s, i) => `${i + 1}. ${s}`),
                        '',
                        'Respond in JSON format:',
                        '{"classification": "...", "description": "...", "suggestedSplits": [{"alertIds": [...], "label": "..."}] | null}',
                      ].join('\n');

                      const executeResult = await actionsClient.execute({
                        actionId: classifyConnectorId,
                        params: {
                          subAction: 'invokeAI',
                          subActionParams: { messages: [{ role: 'user', content: prompt }] },
                        },
                      });

                      const responseData = executeResult.data as { message?: string } | undefined;
                      const responseText = responseData?.message ?? '';

                      // Try to parse JSON from response
                      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                      if (jsonMatch) {
                        try {
                          const parsed = JSON.parse(jsonMatch[0]);
                          return {
                            classification: parsed.classification ?? 'Unknown',
                            description: parsed.description ?? '',
                            suggestedSplits: parsed.suggestedSplits ?? undefined,
                          };
                        } catch {
                          // JSON parse failed, use raw text
                        }
                      }

                      return {
                        classification: responseText.slice(0, 100),
                        description: responseText.slice(0, 300),
                      };
                    } catch (error) {
                      logger.error(`LLM cluster classification failed: ${error}`);
                      return {
                        classification: 'Unknown',
                        description: `Classification error: ${error}`,
                      };
                    }
                  }
                : undefined,
            },
            request.body.dry_run ?? false
          );

          const result = await executor.execute();

          // Update execution record
          await dataClient.updateExecution(execution.id, {
            status: result.errors.length > 0 ? 'failed' : 'completed',
            completedAt: new Date().toISOString(),
            error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
            metrics: result.metrics,
          });

          // Build grouping decisions summary for debugging
          const groupingDecisionsSummary = result.groupingDecisions.map((decision) => ({
            alert_id: decision.alertId,
            case_id: decision.caseId,
            create_new_case: decision.createNewCase,
            match_score: decision.matchScore,
            explanation: decision.explanation,
            matched_observables: decision.matchedObservables,
            entity_count: decision.entities.length,
          }));

          // Build removed alerts summary for debugging
          const removedAlertsSummary = result.removedAlerts.map((removed) => ({
            alert_id: removed.alertId,
            case_id: removed.caseId,
            reason: removed.reason,
          }));

          // Build merged cases summary for debugging
          const mergedCasesSummary = result.mergedCases.map((merged) => ({
            source_case_id: merged.sourceCaseId,
            source_case_title: merged.sourceCaseTitle,
            target_case_id: merged.targetCaseId,
            target_case_title: merged.targetCaseTitle,
            reason: merged.reason,
          }));

          return response.ok({
            body: {
              execution_id: execution.id,
              workflow_id: workflow.id,
              status: result.errors.length > 0 ? 'failed' : 'completed',
              is_dry_run: request.body.dry_run ?? false,
              metrics: result.metrics,
              dry_run_result: result.dryRunResult,
              grouping_decisions: groupingDecisionsSummary,
              removed_alerts: removedAlertsSummary,
              merged_cases: mergedCasesSummary,
              errors: result.errors,
            },
          });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);
          return resp.error({ body: error.message, statusCode: error.statusCode });
        }
      }
    );

  // Get execution history
  router.versioned
    .get({
      access: 'public',
      path: WORKFLOW_EXECUTIONS,
      security: {
        authz: {
          requiredPrivileges: [ATTACK_DISCOVERY_API_ACTION_ALL],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(WorkflowIdParamsSchema),
            query: buildRouteValidationWithZod(FindExecutionsQuerySchema),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse> => {
        const performChecksContext = await context.resolve([
          'core',
          'elasticAssistant',
          'licensing',
        ]);
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;

        const checkResponse = await performChecks({
          context: performChecksContext,
          request,
          response,
        });

        if (!checkResponse.isSuccess) {
          return checkResponse.response;
        }

        try {
          const authenticatedUser = await assistantContext.getCurrentUser();
          if (!authenticatedUser) {
            return resp.error({ body: 'Authenticated user not found', statusCode: 401 });
          }

          const spaceId = assistantContext.getSpaceId();
          const soClient = (await context.core).savedObjects.client;

          const dataClient = new WorkflowDataClient({
            logger,
            soClient,
            spaceId,
            currentUser: authenticatedUser.username,
          });

          // Verify workflow exists
          const workflow = await dataClient.getWorkflow(request.params.workflow_id);
          if (!workflow) {
            return resp.error({ body: 'Workflow not found', statusCode: 404 });
          }

          const result = await dataClient.findExecutions(request.params.workflow_id, {
            page: request.query.page,
            perPage: request.query.per_page,
            status: request.query.status as any,
            start: request.query.start,
            end: request.query.end,
          });

          return response.ok({
            body: {
              data: result.executions,
              page: request.query.page ?? 1,
              per_page: request.query.per_page ?? 20,
              total: result.total,
            },
          });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);
          return resp.error({ body: error.message, statusCode: error.statusCode });
        }
      }
    );

  // Get single execution
  router.versioned
    .get({
      access: 'public',
      path: WORKFLOW_EXECUTION_BY_ID,
      security: {
        authz: {
          requiredPrivileges: [ATTACK_DISCOVERY_API_ACTION_ALL],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(ExecutionIdParamsSchema),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse> => {
        const performChecksContext = await context.resolve([
          'core',
          'elasticAssistant',
          'licensing',
        ]);
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;

        const checkResponse = await performChecks({
          context: performChecksContext,
          request,
          response,
        });

        if (!checkResponse.isSuccess) {
          return checkResponse.response;
        }

        try {
          const authenticatedUser = await assistantContext.getCurrentUser();
          if (!authenticatedUser) {
            return resp.error({ body: 'Authenticated user not found', statusCode: 401 });
          }

          const spaceId = assistantContext.getSpaceId();
          const soClient = (await context.core).savedObjects.client;

          const dataClient = new WorkflowDataClient({
            logger,
            soClient,
            spaceId,
            currentUser: authenticatedUser.username,
          });

          // Find the specific execution
          const result = await dataClient.findExecutions(request.params.workflow_id, {
            perPage: 1000,
          });

          const execution = result.executions.find((e) => e.id === request.params.execution_id);
          if (!execution) {
            return resp.error({ body: 'Execution not found', statusCode: 404 });
          }

          return response.ok({ body: execution });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);
          return resp.error({ body: error.message, statusCode: error.statusCode });
        }
      }
    );

  // Cancel execution (placeholder - actual cancellation would require more infrastructure)
  router.versioned
    .post({
      access: 'public',
      path: WORKFLOW_EXECUTION_CANCEL,
      security: {
        authz: {
          requiredPrivileges: [ATTACK_DISCOVERY_API_ACTION_ALL],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(ExecutionIdParamsSchema),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse> => {
        const performChecksContext = await context.resolve([
          'core',
          'elasticAssistant',
          'licensing',
        ]);
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;

        const checkResponse = await performChecks({
          context: performChecksContext,
          request,
          response,
        });

        if (!checkResponse.isSuccess) {
          return checkResponse.response;
        }

        try {
          const authenticatedUser = await assistantContext.getCurrentUser();
          if (!authenticatedUser) {
            return resp.error({ body: 'Authenticated user not found', statusCode: 401 });
          }

          const spaceId = assistantContext.getSpaceId();
          const soClient = (await context.core).savedObjects.client;

          const dataClient = new WorkflowDataClient({
            logger,
            soClient,
            spaceId,
            currentUser: authenticatedUser.username,
          });

          // Find the specific execution
          const result = await dataClient.findExecutions(request.params.workflow_id, {
            perPage: 1000,
          });

          const execution = result.executions.find((e) => e.id === request.params.execution_id);
          if (!execution) {
            return resp.error({ body: 'Execution not found', statusCode: 404 });
          }

          if (execution.status !== 'running') {
            return resp.error({ body: 'Execution is not running', statusCode: 400 });
          }

          // Update status to cancelled
          await dataClient.updateExecution(execution.id, {
            status: 'cancelled',
            completedAt: new Date().toISOString(),
          });

          return response.ok({
            body: {
              ...execution,
              status: 'cancelled',
              completedAt: new Date().toISOString(),
            },
          });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);
          return resp.error({ body: error.message, statusCode: error.statusCode });
        }
      }
    );
};
