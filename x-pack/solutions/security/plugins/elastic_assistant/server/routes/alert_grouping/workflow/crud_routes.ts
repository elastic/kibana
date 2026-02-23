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

import { buildResponse } from '../../../lib/build_response';
import type { ElasticAssistantRequestHandlerContext } from '../../../types';
import { WorkflowDataClient } from '../../../lib/alert_grouping';
import { performChecks } from '../../helpers';

// Route paths
export const ALERT_GROUPING_WORKFLOW_BASE = '/api/security/alert_grouping/workflow';
export const ALERT_GROUPING_WORKFLOW_BY_ID = `${ALERT_GROUPING_WORKFLOW_BASE}/{workflow_id}`;

// Request schemas
const WorkflowScheduleSchema = z.object({
  interval: z.string(),
  timezone: z.string().optional(),
  runOnWeekends: z.boolean().optional(),
});

const EntityTypeConfigSchema = z.object({
  type: z.string(),
  sourceFields: z.array(z.string()),
  weight: z.number().optional(),
  required: z.boolean().optional(),
});

const GroupingConfigSchema = z.object({
  strategy: z.enum(['strict', 'relaxed', 'weighted', 'temporal']),
  entityTypes: z.array(EntityTypeConfigSchema),
  threshold: z.number().optional(),
  timeWindow: z.string().optional(),
  createNewCaseIfNoMatch: z.boolean().optional(),
  maxAlertsPerCase: z.number().optional(),
  mergeSimilarCases: z.boolean().optional(),
  mergeThreshold: z.number().optional(),
});

const AlertFilterSchema = z.object({
  alertsIndexPattern: z.string().optional(),
  excludeTags: z.array(z.string()).optional(),
  includeStatuses: z.array(z.enum(['open', 'acknowledged', 'closed'])).optional(),
  severityThreshold: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  timeRange: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .optional(),
  customFilter: z.record(z.unknown()).optional(),
  maxAlertsPerRun: z.number().optional(),
});

const ApiConfigSchema = z.object({
  connectorId: z.string(),
  actionTypeId: z.string(),
  model: z.string().optional(),
});

const AttackDiscoveryConfigSchema = z.object({
  enabled: z.boolean().optional(),
  mode: z.enum(['full', 'incremental', 'delta']).optional(),
  triggerOnAlertCount: z.number().optional(),
  triggerDebounce: z.string().optional(),
  attachToCase: z.boolean().optional(),
  /** Enable validation of alert relevance using Attack Discovery results */
  validateAlertRelevance: z.boolean().optional(),
  /** Enable case merging based on Attack Discovery similarity analysis */
  enableCaseMerging: z.boolean().optional(),
  /** Similarity threshold (0-1) for case merging based on Attack Discovery */
  caseMergeSimilarityThreshold: z.number().min(0).max(1).optional(),
});

const CaseTemplateSchema = z.object({
  titleTemplate: z.string().optional(),
  descriptionTemplate: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  owner: z.string().optional(),
  assignees: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

const CreateWorkflowRequestSchema = z.object({
  name: z.string().max(256),
  description: z.string().max(1000).optional(),
  enabled: z.boolean().optional(),
  schedule: WorkflowScheduleSchema,
  alertFilter: AlertFilterSchema.optional(),
  groupingConfig: GroupingConfigSchema,
  attackDiscoveryConfig: AttackDiscoveryConfigSchema.optional(),
  apiConfig: ApiConfigSchema.optional(),
  caseTemplate: CaseTemplateSchema.optional(),
  tags: z.array(z.string()).max(20).optional(),
});

const UpdateWorkflowRequestSchema = CreateWorkflowRequestSchema.partial();

const FindWorkflowsQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  per_page: z.coerce.number().min(1).max(100).optional(),
  status: z.enum(['enabled', 'disabled']).optional(),
});

const WorkflowIdParamsSchema = z.object({
  workflow_id: z.string().uuid(),
});

/**
 * Register workflow CRUD routes
 */
export const registerWorkflowCrudRoutes = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
) => {
  // Create workflow
  router.versioned
    .post({
      access: 'public',
      path: ALERT_GROUPING_WORKFLOW_BASE,
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
            body: buildRouteValidationWithZod(CreateWorkflowRequestSchema),
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

          const workflow = await dataClient.createWorkflow({
            ...request.body,
            groupingConfig: {
              ...request.body.groupingConfig,
              strategy: request.body.groupingConfig.strategy as any,
              entityTypes: request.body.groupingConfig.entityTypes as any,
            },
          });

          // Schedule the workflow if it has a schedule and is enabled
          if (workflow.schedule?.interval && workflow.enabled) {
            const alertGroupingTask = assistantContext.getAlertGroupingTask();
            if (alertGroupingTask) {
              try {
                await alertGroupingTask.scheduleWorkflow(
                  workflow.id,
                  workflow.schedule.interval,
                  spaceId
                );
                logger.info(`Scheduled workflow ${workflow.id} with interval ${workflow.schedule.interval}`);
              } catch (scheduleError) {
                logger.warn(`Failed to schedule workflow ${workflow.id}: ${scheduleError}`);
              }
            }
          }

          return response.ok({ body: workflow });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);
          return resp.error({ body: error.message, statusCode: error.statusCode });
        }
      }
    );

  // Get workflow by ID
  router.versioned
    .get({
      access: 'public',
      path: ALERT_GROUPING_WORKFLOW_BY_ID,
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

          const workflow = await dataClient.getWorkflow(request.params.workflow_id);

          if (!workflow) {
            return resp.error({ body: 'Workflow not found', statusCode: 404 });
          }

          return response.ok({ body: workflow });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);
          return resp.error({ body: error.message, statusCode: error.statusCode });
        }
      }
    );

  // Update workflow
  router.versioned
    .patch({
      access: 'public',
      path: ALERT_GROUPING_WORKFLOW_BY_ID,
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
            body: buildRouteValidationWithZod(UpdateWorkflowRequestSchema),
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

          const workflow = await dataClient.updateWorkflow(request.params.workflow_id, {
            ...request.body,
            groupingConfig: request.body.groupingConfig
              ? {
                  ...request.body.groupingConfig,
                  strategy: request.body.groupingConfig.strategy as any,
                  entityTypes: request.body.groupingConfig.entityTypes as any,
                }
              : undefined,
          });

          if (!workflow) {
            return resp.error({ body: 'Workflow not found', statusCode: 404 });
          }

          // Update scheduling based on workflow state
          const alertGroupingTask = assistantContext.getAlertGroupingTask();
          if (alertGroupingTask) {
            try {
              if (workflow.schedule?.interval && workflow.enabled) {
                // Workflow has schedule and is enabled - ensure it's scheduled
                await alertGroupingTask.updateWorkflowSchedule(
                  workflow.id,
                  workflow.schedule.interval,
                  spaceId,
                  true
                );
                logger.info(`Updated schedule for workflow ${workflow.id}`);
              } else {
                // Workflow is disabled or has no schedule - unschedule it
                await alertGroupingTask.unscheduleWorkflow(workflow.id, spaceId);
                logger.info(`Unscheduled workflow ${workflow.id}`);
              }
            } catch (scheduleError) {
              logger.warn(`Failed to update workflow schedule for ${workflow.id}: ${scheduleError}`);
            }
          }

          return response.ok({ body: workflow });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);
          return resp.error({ body: error.message, statusCode: error.statusCode });
        }
      }
    );

  // Delete workflow
  router.versioned
    .delete({
      access: 'public',
      path: ALERT_GROUPING_WORKFLOW_BY_ID,
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
            query: buildRouteValidationWithZod(
              z.object({
                delete_history: z.coerce.boolean().optional(),
              })
            ),
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

          // Unschedule the workflow task before deleting
          const alertGroupingTask = assistantContext.getAlertGroupingTask();
          if (alertGroupingTask) {
            try {
              await alertGroupingTask.unscheduleWorkflow(request.params.workflow_id, spaceId);
              logger.info(`Unscheduled workflow ${request.params.workflow_id}`);
            } catch (scheduleError) {
              logger.warn(`Failed to unschedule workflow ${request.params.workflow_id}: ${scheduleError}`);
            }
          }

          const deleted = await dataClient.deleteWorkflow(
            request.params.workflow_id,
            request.query.delete_history ?? false
          );

          if (!deleted) {
            return resp.error({ body: 'Workflow not found', statusCode: 404 });
          }

          return response.noContent();
        } catch (err) {
          logger.error(err);
          const error = transformError(err);
          return resp.error({ body: error.message, statusCode: error.statusCode });
        }
      }
    );

  // List workflows
  router.versioned
    .get({
      access: 'public',
      path: ALERT_GROUPING_WORKFLOW_BASE,
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
            query: buildRouteValidationWithZod(FindWorkflowsQuerySchema),
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

          const result = await dataClient.findWorkflows({
            page: request.query.page,
            perPage: request.query.per_page,
            enabled: request.query.status === 'enabled' ? true : request.query.status === 'disabled' ? false : undefined,
          });

          return response.ok({
            body: {
              data: result.workflows,
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

  // Enable workflow
  router.versioned
    .post({
      access: 'public',
      path: `${ALERT_GROUPING_WORKFLOW_BY_ID}/_enable`,
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

          const workflow = await dataClient.updateWorkflow(request.params.workflow_id, {
            enabled: true,
          });

          if (!workflow) {
            return resp.error({ body: 'Workflow not found', statusCode: 404 });
          }

          return response.ok({ body: workflow });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);
          return resp.error({ body: error.message, statusCode: error.statusCode });
        }
      }
    );

  // Disable workflow
  router.versioned
    .post({
      access: 'public',
      path: `${ALERT_GROUPING_WORKFLOW_BY_ID}/_disable`,
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

          const workflow = await dataClient.updateWorkflow(request.params.workflow_id, {
            enabled: false,
          });

          if (!workflow) {
            return resp.error({ body: 'Workflow not found', statusCode: 404 });
          }

          return response.ok({ body: workflow });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);
          return resp.error({ body: error.message, statusCode: error.statusCode });
        }
      }
    );
};
