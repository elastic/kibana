/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { Logger } from '@kbn/core/server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import dedent from 'dedent';
import { OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID } from '../../common/constants';
import type { ObservabilityAgentBuilderCoreSetup } from '../types';

const alertDataSchema = z.object({
  alertId: z.string(),
  attachmentLabel: z.string().optional(),
});

export type AlertAttachmentData = z.infer<typeof alertDataSchema>;

export function createAlertAttachmentType({
  core,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  logger: Logger;
}): AttachmentTypeDefinition<typeof OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID, AlertAttachmentData> {
  return {
    id: OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID,
    validate: (input) => {
      const parsed = alertDataSchema.safeParse(input);
      if (parsed.success) {
        return { valid: true, data: parsed.data };
      }
      return { valid: false, error: parsed.error.message };
    },
    format: async (attachment, context) => {
      const alertId = attachment.data.alertId;

      try {
        const [, startDeps] = await core.getStartServices();
        const alertsClient = await startDeps.ruleRegistry.getRacClientWithRequest(context.request);
        const alertDoc = await alertsClient.get({ id: alertId });

        return {
          getRepresentation: () => ({
            type: 'text',
            value: JSON.stringify(alertDoc, null, 2),
          }),
        };
      } catch (error) {
        logger.error(
          `Failed to fetch alert ${alertId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );

        return {
          getRepresentation: () => ({
            type: 'text',
            value: `Failed to fetch alert ${alertId}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          }),
        };
      }
    },
    getTools: () => [],
    getAgentDescription: () =>
      dedent(
        `An Observability alert attachment containing full alert information including rule name, status, reason, and related entities.`
      ),
  };
}
