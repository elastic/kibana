/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, serverUnavailable } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { createNightshiftInvestigationsServerRoute } from '../create_server_route';
import { NIGHTSHIFT_AUTOMATION_SO_TYPE } from '../../saved_objects/automation_saved_object';
import { generateWorkflowYaml } from '../../lib/automations/generate_workflow_yaml';
import type { NightshiftAutomationAttributes } from '../../lib/automations/types';

const triggerRowSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('alert'),
    ruleNamePattern: z.string().max(1000).optional(),
    ruleNameMatchMode: z.enum(['substring', 'regex']).optional(),
    alertStatus: z.enum(['active', 'inactive', 'any']).optional(),
    tags: z.array(z.string().max(500)).optional(),
  }),
  z.object({
    kind: z.literal('schedule'),
    schedulePreset: z.enum(['hourly', 'daily', 'weekly', 'custom']).optional(),
    cronExpression: z.string().max(100).optional(),
    timezone: z.string().max(100).optional(),
    scopeQuery: z.string().max(10000).optional(),
  }),
]);

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
    path: z.object({ id: z.string().min(1).max(512) }),
    body: z.object({
      name: z.string().min(1).max(500).optional(),
      description: z.string().max(5000).optional(),
      isEnabled: z.boolean().optional(),
      trigger: z.object({ rows: z.array(triggerRowSchema).min(1) }).optional(),
      execution: z
        .object({
          promptTemplate: z.string().max(50000).optional(),
          reasoningMode: z.enum(['investigate', 'observe']).optional(),
          agentId: z.string().max(512).optional(),
          connectorId: z.string().max(512).optional(),
        })
        .optional(),
      completion: z
        .object({
          action: z.enum(['create_investigation', 'post_to_slack', 'silent']).optional(),
          targetMode: z.enum(['thread', 'channel', 'self']).optional(),
          destination: z.string().max(500).optional(),
        })
        .optional(),
      runtime: z
        .object({
          dailyDispatchLimit: z.number().int().min(0).optional(),
          timeoutSeconds: z.number().int().min(1).optional(),
          dedupeWindowSeconds: z.number().int().min(0).optional(),
          dedupeMode: z.enum(['event_id', 'rule_id', 'none']).optional(),
          overlapPolicy: z.enum(['drop', 'cancel_in_progress', 'queue']).optional(),
        })
        .optional(),
    }),
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

    // Merge nested objects field-by-field so a partial execution/completion/runtime patch
    // does not erase fields that were omitted from the request body.
    const merged: NightshiftAutomationAttributes = {
      ...existing.attributes,
      ...(params.body.name !== undefined && { name: params.body.name }),
      ...(params.body.description !== undefined && { description: params.body.description }),
      ...(params.body.isEnabled !== undefined && { isEnabled: params.body.isEnabled }),
      ...(params.body.trigger !== undefined && { trigger: params.body.trigger }),
      ...(params.body.execution !== undefined && {
        execution: { ...existing.attributes.execution, ...params.body.execution },
      }),
      ...(params.body.completion !== undefined && {
        completion: { ...existing.attributes.completion, ...params.body.completion },
      }),
      ...(params.body.runtime !== undefined && {
        runtime: { ...existing.attributes.runtime, ...params.body.runtime },
      }),
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

    const { workflowId: _workflowId, ...soUpdates } = merged;
    await soClient.update<NightshiftAutomationAttributes>(
      NIGHTSHIFT_AUTOMATION_SO_TYPE,
      params.path.id,
      soUpdates
    );

    return { id: params.path.id, ...merged };
  },
});
