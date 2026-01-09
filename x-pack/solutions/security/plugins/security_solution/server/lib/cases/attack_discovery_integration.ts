/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, CoreStart } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { v4 as uuidv4 } from 'uuid';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';

import { generateAndUpdateAttackDiscoveries } from '@kbn/elastic-assistant-plugin/server/routes/attack_discovery/helpers/generate_and_update_discoveries';
import type {
    TriggerAttackDiscoveryFn,
    AttackDiscoveryTriggerResult,
    AttackDiscoveryAlertInfo,
} from '@kbn/cases-plugin/server/services/attack_discovery_integration';
import { ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX } from '@kbn/elastic-assistant-common';
import type { ElasticAssistantRequestHandlerContext } from '@kbn/elastic-assistant-plugin/server/types';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import { transformESSearchToAnonymizationFields } from '@kbn/elastic-assistant-plugin/server/ai_assistant_data_clients/anonymization_fields/helpers';
import type { EsAnonymizationFieldsSchema } from '@kbn/elastic-assistant-plugin/server/ai_assistant_data_clients/anonymization_fields/types';

/**
 * Builds an Elasticsearch filter query for the given alert IDs
 * Uses the 'ids' query which is the recommended way to query documents by their _id field
 */
function buildAlertIdsFilter(alertIds: string[]): any {
    return {
        ids: {
            values: alertIds,
        },
    };
}

/**
 * Gets the default connector ID for attack discovery
 */
async function getDefaultConnectorId(
    core: CoreStart,
    inference: InferenceServerStart,
    request: KibanaRequest,
    logger: Logger
): Promise<string | undefined> {
    try {
        const soClient = core.savedObjects.getScopedClient(request);
        const uiSettingsClient = core.uiSettings.asScopedToClient(soClient);

        const defaultConnectorSetting = await uiSettingsClient.get<string | undefined>(
            GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR
        );

        const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';
        const hasValidDefaultConnector =
            defaultConnectorSetting && defaultConnectorSetting !== NO_DEFAULT_CONNECTOR;

        if (hasValidDefaultConnector) {
            logger.debug(`Using default AI connector from UI setting: ${defaultConnectorSetting}`);
            return defaultConnectorSetting;
        }

        // Fallback to inference plugin default
        const defaultConnector = await inference.getDefaultConnector(request);
        if (defaultConnector?.connectorId) {
            logger.debug(`Using default connector from inference plugin: ${defaultConnector.connectorId}`);
            return defaultConnector.connectorId;
        }

        logger.warn('No default AI connector configured for attack discovery');
        return undefined;
    } catch (error) {
        logger.error(
            `Failed to get default connector: ${error instanceof Error ? error.message : String(error)}`
        );
        return undefined;
    }
}

/**
 * Creates a trigger function that uses the Elastic Assistant request context
 * This version requires access to the request context which has all the necessary services
 */
export const createCaseAttackDiscoveryTrigger = ({
    core,
    getElasticAssistantContext,
    getSpaceId,
    logger,
    inference,
    getAlertsIndexPattern,
}: {
    core: CoreStart;
    getElasticAssistantContext: (
        request: KibanaRequest
    ) => Promise<ElasticAssistantRequestHandlerContext['elasticAssistant']>;
    getSpaceId: (request: KibanaRequest) => string;
    logger: Logger;
    inference: InferenceServerStart;
    getAlertsIndexPattern?: (request: KibanaRequest) => Promise<string>;
}): TriggerAttackDiscoveryFn => {
    return async (params: {
        alertIds: string[];
        caseId: string;
        alertsIndexPattern: string;
        request: KibanaRequest;
    }): Promise<AttackDiscoveryTriggerResult> => {
        const { alertIds, caseId, alertsIndexPattern: providedAlertsIndexPattern, request } = params;
        const executionUuid = uuidv4();

        try {
            logger.debug(
                `Triggering attack discovery for case ${caseId} with ${alertIds.length} alert(s)`
            );

            // Get the Elastic Assistant context using the provided request
            const assistantContext = await getElasticAssistantContext(request);

            if (!assistantContext) {
                logger.warn(`Elastic Assistant context not available for case ${caseId}`);
                return {
                    executionUuid,
                    success: false,
                    error: 'Elastic Assistant context not available',
                };
            }

            // Get required services from context
            const actionsClient = await assistantContext.actions.getActionsClientWithRequest(request);
            const dataClient = await assistantContext.getAttackDiscoveryDataClient();
            const esClient = core.elasticsearch.client.asScoped(request).asCurrentUser;
            const savedObjectsClient = core.savedObjects.getScopedClient(request, {
                includedHiddenTypes: [],
            });
            const authenticatedUser = await assistantContext.getCurrentUser();
            const telemetry = assistantContext.telemetry;

            if (!dataClient) {
                logger.warn(`Attack discovery data client not available for case ${caseId}`);
                return {
                    executionUuid,
                    success: false,
                    error: 'Attack discovery data client not available',
                };
            }

            if (!authenticatedUser) {
                logger.warn(`Authenticated user not available for case ${caseId}`);
                return {
                    executionUuid,
                    success: false,
                    error: 'Authenticated user not available',
                };
            }

            // Get default connector from UI settings or inference plugin
            const defaultConnectorId = await getDefaultConnectorId(core, inference, request, logger);

            if (!defaultConnectorId) {
                logger.warn(
                    `No default connector configured for attack discovery, skipping for case ${caseId}`
                );
                return {
                    executionUuid,
                    success: false,
                    error: 'No default connector configured',
                };
            }

            // Get connector details
            const connector = await actionsClient.get({ id: defaultConnectorId });
            if (!connector) {
                logger.warn(`Connector ${defaultConnectorId} not found for case ${caseId}`);
                return {
                    executionUuid,
                    success: false,
                    error: `Connector ${defaultConnectorId} not found`,
                };
            }


            logger.debug(`[Attack Discovery] Alert IDs to query: ${JSON.stringify(alertIds)}`);

            // Build filter for the alert IDs using 'ids' query
            const filter = buildAlertIdsFilter(alertIds);
            logger.debug(`[Attack Discovery] Built filter: ${JSON.stringify(filter)}`);

            // Get alerts index pattern
            const effectiveAlertsIndexPattern =
                // providedAlertsIndexPattern ||
                // (await getAlertsIndexPattern?.(request)) ||
                '.alerts-security.alerts-default';

            // Get anonymization fields from the data client
            const anonymizationFieldsDataClient =
                await assistantContext.getAIAssistantAnonymizationFieldsDataClient();
            let anonymizationFields: AnonymizationFieldResponse[] = [];

            if (anonymizationFieldsDataClient) {
                try {
                    const anonymizationFieldsResult =
                        await anonymizationFieldsDataClient.findDocuments<EsAnonymizationFieldsSchema>({
                            perPage: 1000,
                            page: 1,
                        });

                    if (anonymizationFieldsResult?.data) {
                        anonymizationFields = transformESSearchToAnonymizationFields(
                            anonymizationFieldsResult.data
                        );
                    }
                } catch (error) {
                    logger.warn(
                        `Failed to retrieve anonymization fields for case ${caseId}: ${error instanceof Error ? error.message : String(error)}`
                    );
                    // Continue with empty array if retrieval fails
                }
            }

            // Build attack discovery config
            const config = {
                alertsIndexPattern: encodeURIComponent(effectiveAlertsIndexPattern),
                apiConfig: {
                    connectorId: defaultConnectorId,
                    actionTypeId: connector.actionTypeId,
                    name: connector.name,
                },
                anonymizationFields,
                end: 'now',
                filter,
                size: alertIds.length,
                start: 'now-30d',
                replacements: {},
                subAction: 'invokeAI' as const,
            };

            logger.error(
                `Attack discovery config: alertsIndexPattern=${effectiveAlertsIndexPattern}, connectorId=${defaultConnectorId}, connectorName=${connector.name}, actionTypeId=${connector.actionTypeId}, size=${alertIds.length}, anonymizationFieldsCount=${anonymizationFields.length}, filter=${JSON.stringify(filter)}`
            );

            // Trigger attack discovery generation
            logger.error(
                `Starting attack discovery generation for case ${caseId} with ${alertIds.length} alert(s), execution UUID: ${executionUuid}`
            );

            const result = await generateAndUpdateAttackDiscoveries({
                actionsClient,
                authenticatedUser,
                config,
                dataClient,
                enableFieldRendering: true,
                esClient,
                executionUuid,
                logger: assistantContext.logger,
                savedObjectsClient,
                telemetry,
                withReplacements: false,
            });

            if (result.error) {
                logger.error(
                    `Attack discovery generation failed for case ${caseId}: ${result.error.message || 'Unknown error'}`
                );
                return {
                    executionUuid,
                    success: false,
                    error: result.error.message || 'Unknown error',
                };
            }

            // Log generation results for debugging
            const generatedCount = result.attackDiscoveries?.length ?? 0;
            logger.debug(
                `Attack discovery generation completed for case ${caseId}, execution UUID: ${executionUuid}, generated ${generatedCount} attack discovery alert(s)`
            );

            if (generatedCount === 0) {
                logger.warn(
                    `No attack discoveries were generated for case ${caseId} with ${alertIds.length} alert(s). This may be due to: 1) No attack patterns detected by the LLM, 2) All discoveries were deduplicated, or 3) An issue during transformation.`
                );
            }

            // Extract attack discovery alert IDs and indices with metadata
            const spaceId = getSpaceId(request);
            const attackDiscoveryAlerts: AttackDiscoveryAlertInfo[] =
                result.attackDiscoveries?.map((discovery) => ({
                    alertId: discovery.id,
                    index: `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`,
                    // Include metadata for external reference attachment
                    title: discovery.title,
                    timestamp: discovery.timestamp,
                    generationUuid: executionUuid,
                })) || [];

            logger.info(
                `Successfully generated attack discovery for case ${caseId}, execution UUID: ${executionUuid}, created ${attackDiscoveryAlerts.length} attack discovery alert(s)`
            );

            return {
                executionUuid,
                success: true,
                attackDiscoveryAlerts,
            };
        } catch (error) {
            logger.error(
                `Failed to trigger attack discovery for case ${caseId}: ${error instanceof Error ? error.message : String(error)}`
            );
            return {
                executionUuid,
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    };
};


