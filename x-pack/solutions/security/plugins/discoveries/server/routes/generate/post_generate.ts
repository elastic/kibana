/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, CoreStart, IRouter, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';
import type { SourceMetadata } from '@kbn/discoveries/impl/attack_discovery/persistence/event_logging';
import { PostGenerateRequestBody } from '@kbn/discoveries-schemas';
import type { PostGenerateResponse } from '@kbn/discoveries-schemas';
import { v4 as uuidv4 } from 'uuid';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { createTracedLogger } from '@kbn/discoveries/impl/lib/create_traced_logger';
import { validateRequest } from '@kbn/discoveries/impl/attack_discovery/generation/validate_request';
import type { DiscoveriesPluginStartDeps } from '../../types';
import { resolveConnectorDetails } from '../../workflows/helpers/resolve_connector_details';
import { DEFAULT_ROUTE_HANDLER_TIMEOUT_MS } from '../constants';
import { assertWorkflowsEnabled } from '../../lib/assert_workflows_enabled';
import type { WorkflowInitializationService } from '../../lib/workflow_initialization';
import { executeGenerationWorkflow, getInferredPrebuiltStepTypes } from './helpers';

const ROUTE_PATH = '/internal/attack_discovery/_generate';

export const registerGenerateRoute = (
  router: IRouter,
  logger: Logger,
  {
    analytics,
    getEventLogIndex,
    getEventLogger,
    getStartServices,
    workflowInitService,
    workflowsManagementApi,
  }: {
    analytics: AnalyticsServiceSetup;
    getEventLogIndex: () => Promise<string>;
    getEventLogger: () => Promise<IEventLogger>;
    getStartServices: () => Promise<{
      coreStart: CoreStart;
      pluginsStart: DiscoveriesPluginStartDeps;
    }>;
    workflowInitService: WorkflowInitializationService;
    workflowsManagementApi?: WorkflowsServerPluginSetup['management'];
  }
) => {
  router.versioned
    .post({
      access: 'internal',
      path: ROUTE_PATH,
      security: {
        authz: {
          requiredPrivileges: [ATTACK_DISCOVERY_API_ACTION_ALL],
        },
      },
      options: {
        timeout: {
          idleSocket: DEFAULT_ROUTE_HANDLER_TIMEOUT_MS,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: PostGenerateRequestBody,
          },
        },
      },
      async (context, request, response) => {
        const disabledResponse = await assertWorkflowsEnabled({ context, response });
        if (disabledResponse) {
          return disabledResponse;
        }

        try {
          const validated = validateRequest({ requestBody: request.body });

          if (!validated.ok) {
            return response.badRequest({ body: validated.body });
          }

          const { requestBody, workflowConfig } = validated;

          const {
            alerts_index_pattern: alertsIndexPattern,
            api_config: apiConfig,
            end,
            filter,
            size,
            source: requestSource,
            source_metadata: requestSourceMetadata,
            start,
          } = requestBody;
          const type = 'attack_discovery';

          const sourceMetadata: SourceMetadata | undefined =
            requestSourceMetadata?.action_execution_uuid != null &&
            requestSourceMetadata?.rule_id != null &&
            requestSourceMetadata?.rule_name != null
              ? {
                  actionExecutionUuid: requestSourceMetadata.action_execution_uuid,
                  ruleId: requestSourceMetadata.rule_id,
                  ruleName: requestSourceMetadata.rule_name,
                }
              : undefined;

          const executionUuid = uuidv4();
          const tracedLogger = createTracedLogger(logger, executionUuid);

          // Resolve action_type_id from connector_id when not provided.
          // getStartServices() is only called when a lookup is required:
          const resolvedApiConfig =
            apiConfig.action_type_id != null
              ? apiConfig
              : await (async () => {
                  const { pluginsStart } = await getStartServices();
                  const actionsClient = await pluginsStart.actions.getActionsClientWithRequest(
                    request
                  );
                  const { actionTypeId } = await resolveConnectorDetails({
                    actionsClient,
                    connectorId: apiConfig.connector_id,
                    inference: pluginsStart.inference,
                    logger: tracedLogger,
                    request,
                  });
                  return { ...apiConfig, action_type_id: actionTypeId };
                })();

          tracedLogger.info(`Starting Attack discovery ${type} pipeline via generation workflow`);
          tracedLogger.debug(
            () =>
              `Workflow configuration: ${JSON.stringify({
                alert_retrieval_workflow_ids: workflowConfig.alert_retrieval_workflow_ids,
                alerts_index_pattern: alertsIndexPattern,
                end,
                filter,
                default_alert_retrieval_mode: workflowConfig.default_alert_retrieval_mode,
                esql_query: workflowConfig.esql_query,
                validation_workflow_id: workflowConfig.validation_workflow_id,
                start,
              })}`
          );

          executeGenerationWorkflow({
            alertsIndexPattern,
            analytics,
            apiConfig: resolvedApiConfig,
            end,
            executionUuid,
            filter,
            getEventLogIndex,
            getEventLogger,
            getInferredPrebuiltStepTypes,
            getStartServices,
            logger: tracedLogger,
            request,
            size,
            source: requestSource,
            sourceMetadata,
            start,
            trigger: 'manual',
            type,
            workflowConfig,
            workflowInitService,
            workflowsManagementApi,
          }).catch((err) => {
            tracedLogger.error(`Generation workflow failed: ${err.message}`);
          });

          const responseBody: PostGenerateResponse = {
            execution_uuid: executionUuid,
          };

          return response.ok({
            body: responseBody,
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.error(`Error starting generation: ${errorMessage}`);
          const error = transformError(err);

          return response.customError({
            statusCode: error.statusCode,
            body: {
              message: error.message,
            },
          });
        }
      }
    );
};
