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
    kind: z.literal('significant_event'),
    severities: z.array(z.enum(['80-critical', '60-high', '40-medium', '20-low'])).optional(),
    statuses: z.array(z.enum(['pending', 'open', 'closed', 'dismissed'])).optional(),
    streamNames: z.array(z.string()).optional(),
  }),
  z.object({
    kind: z.literal('alert'),
    ruleNamePattern: z.string().optional(),
    ruleNameMatchMode: z.enum(['substring', 'regex']).optional(),
    alertStatus: z.enum(['firing', 'recovered', 'any']).optional(),
    tags: z.array(z.string()).optional(),
  }),
  z.object({
    kind: z.literal('schedule'),
    schedulePreset: z.enum(['hourly', 'daily', 'weekly', 'custom']).optional(),
    cronExpression: z.string().optional(),
    timezone: z.string().optional(),
    scopeQuery: z.string().optional(),
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
    path: z.object({ id: z.string().min(1) }),
    body: z.object({
      name: z.string().min(1).max(500).optional(),
      description: z.string().max(5000).optional(),
      isEnabled: z.boolean().optional(),
      trigger: z.object({ rows: z.array(triggerRowSchema).min(1) }).optional(),
      execution: z
        .object({
          promptTemplate: z.string().optional(),
          reasoningMode: z.enum(['investigate', 'observe']).optional(),
          agentId: z.string().optional(),
          connectorId: z.string().optional(),
        })
        .optional(),
      completion: z
        .object({
          action: z.enum(['create_investigation', 'post_to_slack', 'silent']).optional(),
          targetMode: z.enum(['thread', 'channel', 'self']).optional(),
          destination: z.string().optional(),
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

    const updates: Partial<NightshiftAutomationAttributes> = {
      ...params.body,
      updatedAt: new Date().toISOString(),
    };

    await soClient.update<NightshiftAutomationAttributes>(
      NIGHTSHIFT_AUTOMATION_SO_TYPE,
      params.path.id,
      updates
    );

    const merged: NightshiftAutomationAttributes = {
      ...existing.attributes,
      ...updates,
    };

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

    return { id: params.path.id, ...merged };
  },
});
