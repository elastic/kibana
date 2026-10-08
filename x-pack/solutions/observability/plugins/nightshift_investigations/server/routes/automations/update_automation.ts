/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, serverUnavailable } from '@hapi/boom';
import { lazySchema, z } from '@kbn/zod/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { createNightshiftInvestigationsServerRoute } from '../create_server_route';
import { NIGHTSHIFT_AUTOMATION_SO_TYPE } from '../../saved_objects/automation_saved_object';
import { generateWorkflowYaml } from '../../lib/automations/generate_workflow_yaml';
import type { NightshiftAutomationAttributes } from '../../lib/automations/types';
import {
  completionSchema,
  executionSchema,
  runtimeSchema,
  triggerSchema,
} from './automation_schemas';

const applyChanges = <T extends object>(
  current: T,
  changes: { [K in keyof T]?: T[K] | null }
): T => {
  const updated = { ...current };
  Object.entries(changes).forEach(([key, value]) => {
    if (value !== undefined) Object.assign(updated, { [key]: value ?? undefined });
  });
  return updated;
};

export const updateAutomationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'PUT /internal/nightshift/automations/{id}',
  options: {
    access: 'internal',
    summary: 'Update an automation',
    description: 'Updates a nightshift automation and regenerates its backing workflow document.',
  },
  security: {
    authz: { requiredPrivileges: ['manage_nightshift'] },
  },
  params: z.object({
    path: lazySchema(() => z.object({ id: z.string().min(1).max(512) })),
    // `null` clears a field, so the clearable fields override the shared create schemas.
    body: lazySchema(() =>
      z.object({
        name: z.string().min(1).max(500).optional(),
        description: z.string().max(5000).nullable().optional(),
        tags: z.array(z.string().max(32)).max(50).optional(),
        isEnabled: z.boolean().optional(),
        trigger: triggerSchema.optional(),
        execution: executionSchema
          .extend({ promptTemplate: z.string().max(50000).nullable().optional() })
          .optional(),
        completion: completionSchema
          .extend({
            action: z
              .enum(['create_investigation', 'post_to_slack', 'silent'])
              .nullable()
              .optional(),
            targetMode: z.enum(['thread', 'channel', 'self']).nullable().optional(),
            destination: z.string().max(500).nullable().optional(),
          })
          .optional(),
        runtime: runtimeSchema
          .extend({ dailyDispatchLimit: z.number().int().min(0).nullable().optional() })
          .optional(),
      })
    ),
  }),
  handler: async ({ request, params, getAutomationsSoClient, getWorkflowsManagement, context }) => {
    const workflowsManagement = getWorkflowsManagement();
    if (!workflowsManagement) {
      throw serverUnavailable('Workflows management is not available');
    }

    const spaceId =
      (await context.core).savedObjects.client.getCurrentNamespace() ?? DEFAULT_SPACE_ID;
    const soClient = getAutomationsSoClient(request, spaceId);

    const existing = await soClient.get<NightshiftAutomationAttributes>(
      NIGHTSHIFT_AUTOMATION_SO_TYPE,
      params.path.id
    );
    const { body } = params;
    const merged: NightshiftAutomationAttributes = {
      ...applyChanges(existing.attributes, {
        name: body.name,
        description: body.description,
        tags: body.tags,
        isEnabled: body.isEnabled,
        trigger: body.trigger,
      }),
      execution: applyChanges(existing.attributes.execution, body.execution ?? {}),
      completion: applyChanges(existing.attributes.completion, body.completion ?? {}),
      runtime: applyChanges(existing.attributes.runtime, body.runtime ?? {}),
      updatedAt: new Date().toISOString(),
    };

    // Update the workflow first — if it fails, the SO is left unchanged so reads stay consistent.
    if (existing.attributes.workflowId) {
      try {
        const yaml = generateWorkflowYaml(params.path.id, merged);
        await workflowsManagement.management.updateWorkflow(
          existing.attributes.workflowId,
          { yaml },
          spaceId,
          request
        );
      } catch (err) {
        throw badRequest(`Failed to update backing workflow: ${err.message}`);
      }
    }

    await soClient.update<NightshiftAutomationAttributes>(
      NIGHTSHIFT_AUTOMATION_SO_TYPE,
      params.path.id,
      merged,
      { mergeAttributes: false }
    );

    return { id: params.path.id, ...merged };
  },
});
