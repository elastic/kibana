/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import type { ResolverTypeDefinition } from '@kbn/agent-context-layer-plugin/server';
import { OBSERVABILITY_MONITOR_ATTACHMENT_TYPE_ID } from '../../common';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';
import { observabilityAttachmentDataSchema } from './observability_attachment_data_schema';

const GET_MONITOR_DETAILS_TOOL_ID = 'get_monitor_details';

const monitorDataSchema = observabilityAttachmentDataSchema.extend({
  configId: z.string(),
  monitorName: z.string(),
  monitorType: z.string(),
});

export type MonitorAttachmentData = z.infer<typeof monitorDataSchema>;

export function createMonitorAttachmentType({
  logger,
  dataRegistry,
}: {
  logger: Logger;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
}): ResolverTypeDefinition<
  typeof OBSERVABILITY_MONITOR_ATTACHMENT_TYPE_ID,
  MonitorAttachmentData
> {
  return {
    id: OBSERVABILITY_MONITOR_ATTACHMENT_TYPE_ID,
    validate: (input) => {
      const parsed = monitorDataSchema.safeParse(input);
      if (parsed.success) {
        return { valid: true, data: parsed.data };
      }
      return { valid: false, error: parsed.error.message };
    },
    format: (item) => ({
      type: 'text',
      value: `Observability Synthetics Monitor: ${item.data.monitorName} (${item.data.monitorType}). Use the ${GET_MONITOR_DETAILS_TOOL_ID} tool to fetch full monitor details.`,
    }),
    getBoundedTools: (item) => {
      const { configId, monitorName, monitorType } = item.data;
      return [
        {
          id: GET_MONITOR_DETAILS_TOOL_ID,
          description: `Fetch the full details for synthetics monitor "${monitorName}" (${monitorType}).`,
          type: ToolType.builtin,
          schema: z.object({}),
          confirmation: { askUser: 'never' },
          handler: async (_args, abContext) => {
            const monitorDetails = await dataRegistry.getData('syntheticsMonitorDetails', {
              request: abContext.request,
              configId,
            });

            if (!monitorDetails) {
              throw new Error(`Monitor details not found for ${monitorName} (${configId})`);
            }

            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: monitorDetails as Record<string, unknown>,
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
        `An Observability synthetics monitor attachment. The monitor config ID is provided - Use the ${GET_MONITOR_DETAILS_TOOL_ID} tool to fetch the full monitor configuration details.`
      ),
  };
}
