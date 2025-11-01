/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE } from '../saved_objects';
import type {
  CreateWorkplaceConnectorRequest,
  UpdateWorkplaceConnectorRequest,
  WorkplaceConnectorResponse,
} from '../../common';
import {
  createConnectorRequestSchema,
  updateConnectorRequestSchema,
  connectorIdSchema,
} from './schemas';
import type { WorkflowCreatorService } from '../services/workflow_creator';

export function registerConnectorRoutes(
  router: IRouter,
  workflowCreator: WorkflowCreatorService,
  logger: Logger
) {
  // Create connector
  router.post(
    {
      path: '/api/workplace_connectors',
      validate: {
        body: createConnectorRequestSchema,
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const {
        name,
        type,
        config = {},
        secrets,
        features = [],
      } = request.body as CreateWorkplaceConnectorRequest;

      try {
        const savedObjectsClient = coreContext.savedObjects.client;
        const now = new Date().toISOString();

        // Step 1: Create the connector
        const savedObject = await savedObjectsClient.create(WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE, {
          name,
          type,
          config,
          secrets,
          features,
          createdAt: now,
          updatedAt: now,
        });

        // Step 2: Create the workflow(s) for this connector
        let workflowId: string | undefined;
        const workflowIds: string[] = [];
        const toolIds: string[] = [];
        try {
          // Determine current space/namespace from the saved objects client
          const spaceId = savedObjectsClient.getCurrentNamespace() ?? DEFAULT_NAMESPACE_STRING;

          const featuresToCreate = features.length > 0 ? features : ['search_web'];
          for (const feature of featuresToCreate) {
            const createdWorkflowId = await workflowCreator.createWorkflowForConnector(
              savedObject.id,
              type,
              spaceId,
              request,
              feature
            );
            workflowIds.push(createdWorkflowId);
            toolIds.push(`${type}.${feature}`.slice(0, 64));
          }

          // Step 3: Update the connector with workflow ids and tool ids
          workflowId = workflowIds[0];
          await savedObjectsClient.update(WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE, savedObject.id, {
            workflowId,
            workflowIds,
            toolIds,
          });
        } catch (workflowError) {
          // Log the error but don't fail the connector creation
          // The connector is still usable even without a workflow
          logger.error(
            `Failed to create workflow for connector ${savedObject.id}: ${
              (workflowError as Error).message
            }`
          );
        }

        const attrs = savedObject.attributes as unknown as {
          name: string;
          type: string;
          config: Record<string, unknown>;
          features?: string[];
          createdAt: string;
          updatedAt: string;
        };
        const responseData: WorkplaceConnectorResponse = {
          id: savedObject.id,
          name: attrs.name,
          type: attrs.type,
          config: attrs.config,
          createdAt: attrs.createdAt,
          updatedAt: attrs.updatedAt,
          workflowId,
          workflowIds,
          toolIds,
          features: attrs.features,
          hasSecrets: true,
        };

        return response.ok({
          body: responseData,
        });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to create connector: ${error.message}`,
          },
        });
      }
    }
  );

  // Get connector by ID
  router.get(
    {
      path: '/api/workplace_connectors/{id}',
      validate: {
        params: connectorIdSchema,
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const { id } = request.params;

      try {
        const savedObjectsClient = coreContext.savedObjects.client;
        const savedObject = await savedObjectsClient.get(WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE, id);

        const attrs = savedObject.attributes as unknown as {
          name: string;
          type: string;
          config: Record<string, unknown>;
          createdAt: string;
          updatedAt: string;
          workflowId?: string;
          workflowIds?: string[];
          toolIds?: string[];
          features?: string[];
          secrets?: Record<string, unknown>;
        };

        const responseData: WorkplaceConnectorResponse = {
          id: savedObject.id,
          name: attrs.name,
          type: attrs.type,
          config: attrs.config,
          createdAt: attrs.createdAt,
          updatedAt: attrs.updatedAt,
          workflowId: attrs.workflowId,
          workflowIds: attrs.workflowIds,
          toolIds: attrs.toolIds,
          features: attrs.features,
          hasSecrets: !!attrs.secrets,
        };

        return response.ok({
          body: responseData,
        });
      } catch (error) {
        if (error.output?.statusCode === 404) {
          return response.notFound({
            body: {
              message: `Connector with ID ${id} not found`,
            },
          });
        }
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to get connector: ${error.message}`,
          },
        });
      }
    }
  );

  // List all connectors
  router.get(
    {
      path: '/api/workplace_connectors',
      validate: {},
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
    },
    async (context, request, response) => {
      const coreContext = await context.core;

      try {
        const savedObjectsClient = coreContext.savedObjects.client;
        const findResult = await savedObjectsClient.find({
          type: WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE,
          perPage: 100,
        });

        const connectors: WorkplaceConnectorResponse[] = findResult.saved_objects.map(
          (savedObject) => {
            const attrs = savedObject.attributes as unknown as {
              name: string;
              type: string;
              config: Record<string, unknown>;
              createdAt: string;
              updatedAt: string;
              workflowId?: string;
              workflowIds?: string[];
              toolIds?: string[];
              features?: string[];
              secrets?: Record<string, unknown>;
            };
            return {
              id: savedObject.id,
              name: attrs.name,
              type: attrs.type,
              config: attrs.config,
              createdAt: attrs.createdAt,
              updatedAt: attrs.updatedAt,
              workflowId: attrs.workflowId,
              workflowIds: attrs.workflowIds,
              toolIds: attrs.toolIds,
              features: attrs.features,
              hasSecrets: !!attrs.secrets,
            };
          }
        );

        return response.ok({
          body: {
            connectors,
            total: findResult.total,
          },
        });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to list connectors: ${error.message}`,
          },
        });
      }
    }
  );

  // Update connector
  router.put(
    {
      path: '/api/workplace_connectors/{id}',
      validate: {
        params: connectorIdSchema,
        body: updateConnectorRequestSchema,
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const { id } = request.params;
      const updates = request.body as UpdateWorkplaceConnectorRequest;

      try {
        const savedObjectsClient = coreContext.savedObjects.client;
        const now = new Date().toISOString();

        const savedObject = await savedObjectsClient.update(
          WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE,
          id,
          {
            ...updates,
            updatedAt: now,
          }
        );

        const attrs = savedObject.attributes as unknown as {
          name: string;
          type: string;
          config: Record<string, unknown>;
          createdAt: string;
          updatedAt: string;
          workflowId?: string;
          secrets?: Record<string, unknown>;
        };

        const responseData: WorkplaceConnectorResponse = {
          id: savedObject.id,
          name: attrs.name,
          type: attrs.type,
          config: attrs.config,
          createdAt: attrs.createdAt,
          updatedAt: attrs.updatedAt,
          workflowId: attrs.workflowId,
          hasSecrets: !!attrs.secrets,
        };

        return response.ok({
          body: responseData,
        });
      } catch (error) {
        if (error.output?.statusCode === 404) {
          return response.notFound({
            body: {
              message: `Connector with ID ${id} not found`,
            },
          });
        }
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to update connector: ${error.message}`,
          },
        });
      }
    }
  );

  // Delete connector
  router.delete(
    {
      path: '/api/workplace_connectors/{id}',
      validate: {
        params: connectorIdSchema,
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const { id } = request.params;

      try {
        const savedObjectsClient = coreContext.savedObjects.client;
        // Cascade delete related workflows/tools (best-effort)
        const workflowIds: string[] = [];
        let toolIds: string[] = [];
        try {
          const existing = await savedObjectsClient.get(WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE, id);
          const attrs = existing.attributes as unknown as {
            workflowId?: string;
            workflowIds?: string[];
            toolIds?: string[];
          };
          if (attrs.workflowId) workflowIds.push(attrs.workflowId);
          if (attrs.workflowIds?.length) workflowIds.push(...attrs.workflowIds);
          if (attrs.toolIds?.length) toolIds = attrs.toolIds;
        } catch (e) {
          // ignore if not found
        }

        const spaceId = savedObjectsClient.getCurrentNamespace() ?? DEFAULT_NAMESPACE_STRING;
        try {
          if (workflowIds.length > 0 && workflowCreator.deleteWorkflows) {
            await workflowCreator.deleteWorkflows(workflowIds, spaceId, request);
          }
        } catch {
          // ignore
        }
        try {
          if (toolIds.length > 0 && workflowCreator.deleteTools) {
            await workflowCreator.deleteTools(toolIds, request);
          }
        } catch {
          // ignore
        }

        await savedObjectsClient.delete(WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE, id);

        return response.ok({
          body: {
            success: true,
          },
        });
      } catch (error) {
        if (error.output?.statusCode === 404) {
          return response.notFound({
            body: {
              message: `Connector with ID ${id} not found`,
            },
          });
        }
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to delete connector: ${error.message}`,
          },
        });
      }
    }
  );
}
