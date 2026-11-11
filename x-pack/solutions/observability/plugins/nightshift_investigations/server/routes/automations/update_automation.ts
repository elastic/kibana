/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectId, z, lazySchema } from '@kbn/zod/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { createNightshiftInvestigationsServerRoute } from '../create_server_route';
import { automationCompletionSchema, promptTemplateSchema } from '../../lib/automations/schemas';
import { triggerRowSchema } from './trigger_row_schema';

const automationUpdateSchema = lazySchema(() =>
  z.object({
    name: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).nullable().optional(),
    tags: z.array(z.string().max(32)).max(50).optional(),
    isEnabled: z.boolean().optional(),
    trigger: z.object({ rows: z.array(triggerRowSchema).min(1).max(100) }).optional(),
    execution: z
      .object({
        promptTemplate: promptTemplateSchema.nullable().optional(),
        reasoningMode: z.enum(['investigate', 'observe']).optional(),
        agentId: z.string().max(512).optional(),
        connectorId: z.string().max(512).optional(),
      })
      .optional(),
    completions: z.array(automationCompletionSchema).max(10).optional(),
    runtime: z
      .object({
        dailyDispatchLimit: z.number().int().min(1).nullable().optional(),
        timeoutSeconds: z.number().int().min(1).optional(),
        dedupeWindowSeconds: z.number().int().min(0).optional(),
        overlapPolicy: z.enum(['drop', 'cancel_in_progress', 'queue']).optional(),
      })
      .optional(),
  })
);

export type AutomationUpdate = z.infer<typeof automationUpdateSchema>;

export const updateAutomationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'PUT /internal/nightshift/automations/{id}',
  options: {
    access: 'internal',
    summary: 'Update an automation',
    description: 'Updates an automation and reconciles its generated workflow.',
  },
  security: { authz: { requiredPrivileges: ['manage_nightshift'] } },
  params: lazySchema(() =>
    z.object({ path: z.object({ id: savedObjectId() }), body: automationUpdateSchema })
  ),
  handler: async ({ request, params, getAutomationWorkflowService, context }) => {
    const spaceId =
      (await context.core).savedObjects.client.getCurrentNamespace() ?? DEFAULT_SPACE_ID;
    return getAutomationWorkflowService().update(request, spaceId, params.path.id, params.body);
  },
});
