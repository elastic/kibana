/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { CoreStart } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';

import { GenerateStepCommonDefinition } from '../../../../common/step_types/generate_step';
import type { DiscoveriesPluginStartDeps } from '../../../types';
import { asNonEmpty } from '../../../lib/non_empty_string';
import { resolveConnectorDetails } from '../../helpers/resolve_connector_details';
import { invokeGenerationGraph } from './helpers/invoke_generation_graph';
import { transformDiscoveriesOutput } from './helpers/transform_discoveries_output';

/**
 * Server-side implementation of the generate step.
 * Generates Attack Discoveries from pre-retrieved alerts.
 */
export const getGenerateStepDefinition = ({
  connectorTimeout,
  getEventLogIndex: _getEventLogIndex,
  getEventLogger: _getEventLogger,
  getStartServices,
  langSmithApiKey,
  langSmithProject,
  logger,
}: {
  connectorTimeout: number;
  getEventLogIndex: () => Promise<string>;
  getEventLogger: () => Promise<unknown>;
  getStartServices: () => Promise<{
    coreStart: CoreStart;
    pluginsStart: DiscoveriesPluginStartDeps;
  }>;
  langSmithApiKey?: string;
  langSmithProject?: string;
  logger: Logger;
}) =>
  createServerStepDefinition({
    ...GenerateStepCommonDefinition,
    handler: async (context) => {
      let executionUuid: string | undefined;

      try {
        const workflowContext = context.contextManager.getContext();

        const {
          additional_context: additionalContext,
          api_config: apiConfig,
          replacements,
          size,
        } = context.input;
        const alerts = context.input.alerts ?? [];

        context.logger.info(
          `Starting attack discovery generation from ${alerts.length} pre-retrieved alerts`
        );

        const { coreStart, pluginsStart } = await getStartServices();
        const request = context.contextManager.getFakeRequest();
        executionUuid = workflowContext.execution.id;

        const actionsClient = await pluginsStart.actions.getActionsClientWithRequest(request);
        const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
        const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
        const inferenceClient = pluginsStart.inference?.getClient({ request });

        const parsedApiConfig = apiConfig as {
          action_type_id?: string;
          connector_id: string;
          model?: string;
        };

        // action_type_id arrives as '' from the UI for EIS connectors; asNonEmpty
        // converts it to undefined so resolveConnectorDetails performs a lookup
        // instead of short-circuiting with an empty value:
        const { actionTypeId: resolvedActionTypeId } = await resolveConnectorDetails({
          actionsClient,
          actionTypeId: asNonEmpty(parsedApiConfig.action_type_id),
          connectorId: parsedApiConfig.connector_id,
          inference: pluginsStart.inference,
          logger,
          request,
        });

        const resolvedApiConfig = {
          action_type_id: resolvedActionTypeId,
          connector_id: parsedApiConfig.connector_id,
          ...(parsedApiConfig.model != null ? { model: parsedApiConfig.model } : {}),
        };

        if (alerts.length === 0) {
          context.logger.info(
            `Skipping graph execution because 0 alerts were provided (execution: ${executionUuid})`
          );

          return {
            output: {
              attack_discoveries: null,
              execution_uuid: executionUuid,
              replacements: replacements ?? {},
            },
          };
        }

        const result = await invokeGenerationGraph({
          abortSignal: context.abortSignal,
          actionsClient,
          additionalContext,
          apiConfig: resolvedApiConfig,
          connectorTimeout,
          esClient,
          inferenceClient,
          langSmithApiKey,
          langSmithProject,
          logger,
          replacements,
          savedObjectsClient,
          size,
          sourceAlerts: alerts,
        });

        context.logger.info(
          `Attack Discovery generation completed: ${result.discoveries?.length ?? 0} discoveries`
        );

        const attackDiscoveriesOutput = transformDiscoveriesOutput(result.discoveries, {
          executionUuid,
        });

        return {
          output: {
            attack_discoveries: attackDiscoveriesOutput,
            execution_uuid: executionUuid,
            replacements: result.replacements,
          },
        };
      } catch (error) {
        context.logger.error(
          `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error
        );

        return {
          error: new Error(
            error instanceof Error ? error.message : 'Failed to generate discoveries'
          ),
        };
      }
    },
  });
