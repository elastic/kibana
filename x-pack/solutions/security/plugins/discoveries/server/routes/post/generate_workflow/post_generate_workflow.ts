/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, IRouter, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';
import { PostGenerateWorkflowRequestBody } from '@kbn/discoveries-schemas';
import type { PostGenerateWorkflowResponse } from '@kbn/discoveries-schemas';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

import { getSpaceId } from '@kbn/discoveries/impl/lib/helpers/get_space_id';
import { alertRetrievalBuilderSkill } from '../../../skills/alert_retrieval_builder_skill';
import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';
import type { DiscoveriesPluginStartDeps } from '../../../types';
import { DEFAULT_ROUTE_HANDLER_TIMEOUT_MS } from '../../constants';
import type { WorkflowInitializationService } from '../../../lib/workflow_initialization';
import { buildSkillConfigurationOverrides } from './helpers/build_skill_configuration_overrides';
import { generateWorkflowWithRetries } from './helpers/generate_workflow_with_retries';

const ROUTE_PATH = '/internal/attack_discovery/_generate_workflow';

export const registerGenerateWorkflowRoute = (
  router: IRouter,
  logger: Logger,
  {
    getStartServices,
    workflowInitService,
    workflowsManagementApi,
  }: {
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
            body: PostGenerateWorkflowRequestBody,
          },
        },
      },
      async (context, request, response) => {
        const disabledResponse = await assertWorkflowsEnabled({ context, response });
        if (disabledResponse) {
          return disabledResponse;
        }

        try {
          const { connector_id: connectorId, description } = request.body;

          const { pluginsStart } = await getStartServices();

          const spaceId = getSpaceId({
            request,
            spaces: pluginsStart.spaces?.spacesService,
          });

          workflowInitService.ensureWorkflowsForSpace({ logger, request, spaceId }).catch((err) => {
            logger.debug(
              () =>
                `Background workflow initialization failed for space '${spaceId}': ${err.message}`
            );
          });

          // Check agent builder availability
          const runAgent = pluginsStart.agentBuilder?.agents.runAgent;
          if (!runAgent) {
            return response.customError({
              body: {
                message: 'Agent builder service is not available',
              },
              statusCode: 503,
            });
          }

          // Check workflows management API availability
          if (!workflowsManagementApi) {
            return response.customError({
              body: {
                message: 'Workflows management API is not available',
              },
              statusCode: 503,
            });
          }

          logger.debug(
            () => `[generate_workflow] Starting workflow generation for: "${description}"`
          );

          // Build configuration overrides from the alert retrieval builder skill
          const configurationOverrides = await buildSkillConfigurationOverrides(
            alertRetrievalBuilderSkill
          );

          // Step 1: Generate workflow YAML with retries
          const generateResult = await generateWorkflowWithRetries({
            agentId: agentBuilderDefaultAgentId,
            configurationOverrides,
            connectorId,
            description,
            logger,
            request,
            runAgent,
          });

          if (!generateResult.ok) {
            logger.error(`[generate_workflow] Generation failed: ${generateResult.error}`);

            return response.customError({
              body: {
                message: generateResult.error,
              },
              statusCode: 500,
            });
          }

          // Step 2: Create workflow via management API
          const createdWorkflow = await workflowsManagementApi.createWorkflow(
            { yaml: generateResult.yaml },
            spaceId,
            request
          );

          logger.debug(
            () =>
              `[generate_workflow] Workflow created: ${createdWorkflow.id} (${createdWorkflow.name})`
          );

          const responseBody: PostGenerateWorkflowResponse = {
            workflow_id: createdWorkflow.id,
            workflow_name: createdWorkflow.name,
          };

          return response.ok({ body: responseBody });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.error(`[generate_workflow] Error: ${errorMessage}`);
          const error = transformError(err);

          return response.customError({
            body: {
              message: error.message,
            },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
