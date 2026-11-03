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
import { automationCompletionSchema, promptTemplateSchema } from '../../lib/automations/schemas';
import { generateWorkflowYaml } from '../../lib/automations/generate_workflow_yaml';
import { resolveClusterConnector } from '../../lib/automations/cluster_connector';
import { validateScheduledAutomation } from '../../lib/automations/validate_scheduled_automation';
import {
  deleteInboundWebhook,
  getWebhookConnectorId,
  provisionInboundWebhook,
  type ProvisionedInboundWebhook,
} from '../../lib/automations/inbound_webhook_connector';
import type { NightshiftAutomationAttributes } from '../../lib/automations/types';
import { triggerRowSchema } from './trigger_row_schema';

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
    path: z.object({ id: z.string().min(1).max(512) }),
    body: z.object({
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
    }),
  }),
  handler: async ({
    request,
    params,
    getAutomationsSoClient,
    getWorkflowsManagement,
    getActionsClient,
    getInvestigatorServiceAccountService,
    context,
  }) => {
    const workflowsManagement = getWorkflowsManagement();
    if (!workflowsManagement) {
      throw serverUnavailable('Workflows management is not available');
    }

    const spaceId =
      (await context.core).savedObjects.client.getCurrentNamespace() ?? DEFAULT_SPACE_ID;
    const soClient = getAutomationsSoClient(request, spaceId);
    // Before any write: refuses callers who could not write the bound workflow.
    const serviceAccountId = await getInvestigatorServiceAccountService().resolveAutomationRunAs(
      request,
      spaceId
    );

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
        completions: body.completions,
      }),
      execution: applyChanges(existing.attributes.execution, body.execution ?? {}),
      runtime: applyChanges(existing.attributes.runtime, body.runtime ?? {}),
      updatedAt: new Date().toISOString(),
    };

    const completions = z.array(automationCompletionSchema).max(10).safeParse(merged.completions);
    if (!completions.success) throw badRequest(completions.error.message);
    merged.completions = completions.data;

    validateScheduledAutomation(merged);

    // A request carries no connector id, so an existing webhook keeps its connector (and token);
    // a newly added one gets a connector here, before the workflow that names it is generated.
    const existingConnectorId = getWebhookConnectorId(existing.attributes.trigger);
    const webhookRows = merged.trigger.rows.filter((row) => row.kind === 'webhook');
    if (webhookRows.length > 1) {
      throw badRequest('An automation can have only one webhook trigger');
    }
    const actionsClient = await getActionsClient(request);
    // Only a request that sets the trigger re-checks the cluster connector: an edit that leaves the
    // trigger alone must not fail because the connector was deleted since the last save.
    if (body.trigger) {
      merged.trigger = { rows: await resolveClusterConnector(actionsClient, merged.trigger.rows) };
    }
    let provisioned: ProvisionedInboundWebhook | undefined;
    if (webhookRows.length === 1) {
      if (!existingConnectorId) {
        if (!actionsClient) {
          throw serverUnavailable('Actions is not available');
        }
        provisioned = await provisionInboundWebhook(actionsClient, merged.name);
      }
      const connectorId = existingConnectorId ?? provisioned?.connectorId;
      merged.trigger = {
        rows: merged.trigger.rows.map((row) =>
          row.kind === 'webhook' ? { ...row, connectorId } : row
        ),
      };
    }
    const removeProvisioned = async () => {
      if (provisioned && actionsClient) {
        await deleteInboundWebhook(actionsClient, provisioned.connectorId);
      }
    };

    // Update the workflow first — if it fails, the SO is left unchanged so reads stay consistent.
    if (existing.attributes.workflowId) {
      try {
        await workflowsManagement.management.updateWorkflow(
          existing.attributes.workflowId,
          {
            yaml: generateWorkflowYaml({
              automationId: params.path.id,
              automation: merged,
              serviceAccountId,
            }),
          },
          spaceId,
          request
        );
      } catch (err) {
        await removeProvisioned();
        throw badRequest(`Failed to update backing workflow: ${err.message}`);
      }
    }

    try {
      await soClient.update<NightshiftAutomationAttributes>(
        NIGHTSHIFT_AUTOMATION_SO_TYPE,
        params.path.id,
        merged,
        { mergeAttributes: false }
      );
    } catch (err) {
      await removeProvisioned();
      throw err;
    }

    // The trigger was removed, so its endpoint goes with it.
    if (existingConnectorId && webhookRows.length === 0 && actionsClient) {
      await deleteInboundWebhook(actionsClient, existingConnectorId);
    }

    // The token is returned only when a connector was just provisioned: it cannot be read back.
    return { id: params.path.id, ...merged, ...(provisioned ? { webhook: provisioned } : {}) };
  },
});
