/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import type { ResolverTypeDefinition } from '@kbn/agent-context-layer-plugin/server';
import dedent from 'dedent';
import { OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID } from '../../common/constants';
import type { ObservabilityAgentBuilderCoreSetup } from '../types';
import { observabilityAttachmentDataSchema } from './observability_attachment_data_schema';

const GET_ALERT_DETAILS_TOOL_ID = 'get_alert_details';

const alertDataSchema = observabilityAttachmentDataSchema.extend({
  alertId: z.string(),
});

export type AlertAttachmentData = z.infer<typeof alertDataSchema>;

export function createAlertAttachmentType({
  core,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  logger: Logger;
}): ResolverTypeDefinition<typeof OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID, AlertAttachmentData> {
  return {
    id: OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID,
    validate: (input) => {
      const parsed = alertDataSchema.safeParse(input);
      if (parsed.success) {
        return { valid: true, data: parsed.data };
      }
      return { valid: false, error: parsed.error.message };
    },
    format: (item) => ({
      type: 'text',
      value: `Observability Alert ID: ${item.data.alertId}. Use the ${GET_ALERT_DETAILS_TOOL_ID} tool to fetch full alert information.`,
    }),
    getBoundedTools: (item) => {
      const { alertId } = item.data;
      return [
        {
          id: GET_ALERT_DETAILS_TOOL_ID,
          description: `Fetch full details for alert ${alertId} including rule info, status, reason, and related entities.`,
          type: ToolType.builtin,
          schema: z.object({}),
          confirmation: { askUser: 'never' },
          handler: async (_args, abContext) => {
            const [, startDeps] = await core.getStartServices();
            const alertsClient = await startDeps.ruleRegistry.getRacClientWithRequest(
              abContext.request
            );

            const alertDoc = await alertsClient.get({ id: alertId });

            if (!alertDoc) {
              throw new Error(`Alert document not found for ${alertId}`);
            }

            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: alertDoc as Record<string, unknown>,
                },
              ],
            };
          },
        },
      ];
    },
    getTools: () => [],
    getAgentDescription: () =>
      dedent(
        `An Observability alert attachment. The alert ID is provided - use the ${GET_ALERT_DETAILS_TOOL_ID} tool to fetch full alert information including rule name, status, reason, and related entities.`
      ),
  };
}
