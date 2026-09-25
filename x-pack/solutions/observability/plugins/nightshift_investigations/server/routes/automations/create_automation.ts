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

const triggerSchema = z.object({
  rows: z.array(triggerRowSchema).min(1),
});

const executionSchema = z.object({
  promptTemplate: z.string().max(50000).optional(),
  reasoningMode: z.enum(['investigate', 'observe']).optional(),
  agentId: z.string().max(512).optional(),
  connectorId: z.string().max(512).optional(),
});

const completionSchema = z.object({
  action: z.enum(['create_investigation', 'post_to_slack', 'silent']).optional(),
  targetMode: z.enum(['thread', 'channel', 'self']).optional(),
  destination: z.string().max(500).optional(),
});

const runtimeSchema = z.object({
  dailyDispatchLimit: z.number().int().min(0).optional(),
  timeoutSeconds: z.number().int().min(1).optional(),
  dedupeWindowSeconds: z.number().int().min(0).optional(),
  dedupeMode: z.enum(['event_id', 'rule_id', 'none']).optional(),
  overlapPolicy: z.enum(['drop', 'cancel_in_progress', 'queue']).optional(),
});

export const createAutomationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/automations',
  options: {
    access: 'internal',
    summary: 'Create an automation',
    description: 'Creates a nightshift automation and its backing workflow document.',
  },
  security: {
    authz: { requiredPrivileges: ['manage_nightshift'] },
  },
  params: z.object({
    body: z.object({
      name: z.string().min(1).max(500),
      description: z.string().max(5000).optional(),
      automationType: z.enum(['custom', 'managed']).optional(),
      trigger: triggerSchema,
      execution: executionSchema,
      completion: completionSchema,
      runtime: runtimeSchema,
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

    const now = new Date().toISOString();
    const attributes: NightshiftAutomationAttributes = {
      name: params.body.name,
      description: params.body.description,
      automationType: params.body.automationType ?? 'custom',
      isEnabled: true,
      trigger: params.body.trigger,
      execution: params.body.execution,
      completion: params.body.completion,
      runtime: params.body.runtime,
      createdAt: now,
      updatedAt: now,
    };

    const created = await soClient.create<NightshiftAutomationAttributes>(
      NIGHTSHIFT_AUTOMATION_SO_TYPE,
      attributes
    );

    let workflowId: string;
    try {
      const yaml = generateWorkflowYaml(created.id, attributes);
      const workflow = await workflowsManagement.management.createWorkflow(
        { yaml },
        spaceId,
        request
      );
      workflowId = workflow.id;
    } catch (err) {
      await soClient.delete(NIGHTSHIFT_AUTOMATION_SO_TYPE, created.id);
      throw badRequest(`Failed to create backing workflow: ${err.message}`);
    }

    try {
      await soClient.update<NightshiftAutomationAttributes>(
        NIGHTSHIFT_AUTOMATION_SO_TYPE,
        created.id,
        { workflowId }
      );
    } catch (err) {
      // SO link failed — delete the workflow so the two resources stay in sync.
      try {
        await workflowsManagement.management.deleteWorkflows([workflowId], spaceId, request);
      } catch {
        // Best-effort cleanup; the SO will have no workflowId so the automation is inert.
      }
      await soClient.delete(NIGHTSHIFT_AUTOMATION_SO_TYPE, created.id);
      throw badRequest(`Failed to link workflow to automation: ${err.message}`);
    }

    return { id: created.id, ...attributes, workflowId };
  },
});
