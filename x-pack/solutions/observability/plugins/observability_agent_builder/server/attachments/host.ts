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
import { OBSERVABILITY_HOST_ATTACHMENT_TYPE_ID } from '../../common';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';
import { observabilityAttachmentDataSchema } from './observability_attachment_data_schema';

const GET_HOST_DETAILS_TOOL_ID = 'get_host_details';

const hostDataSchema = observabilityAttachmentDataSchema.extend({
  hostName: z.string(),
  start: z.string(),
  end: z.string(),
});

export type HostAttachmentData = z.infer<typeof hostDataSchema>;

export function createHostAttachmentType({
  logger,
  dataRegistry,
}: {
  logger: Logger;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
}): ResolverTypeDefinition<typeof OBSERVABILITY_HOST_ATTACHMENT_TYPE_ID, HostAttachmentData> {
  return {
    id: OBSERVABILITY_HOST_ATTACHMENT_TYPE_ID,
    validate: (input) => {
      const parsed = hostDataSchema.safeParse(input);
      if (parsed.success) {
        return { valid: true, data: parsed.data };
      }
      return { valid: false, error: parsed.error.message };
    },
    format: (item) => ({
      type: 'text',
      value: `Observability Host Name: ${item.data.hostName}. Use the ${GET_HOST_DETAILS_TOOL_ID} tool to fetch full host details.`,
    }),
    getBoundedTools: (item) => {
      const { hostName, start, end } = item.data;
      return [
        {
          id: GET_HOST_DETAILS_TOOL_ID,
          description: `Fetch the full host details for host ${hostName}.`,
          type: ToolType.builtin,
          schema: z.object({}),
          confirmation: { askUser: 'never' },
          handler: async (_args, abContext) => {
            const hostDetails = await dataRegistry.getData('infraHosts', {
              request: abContext.request,
              from: start,
              to: end,
              limit: 1,
              query: {
                bool: {
                  filter: [{ term: { 'host.name': hostName } }],
                },
              },
            });

            const host = hostDetails?.nodes?.[0];

            if (!host) {
              throw new Error(`Host details not found for ${hostName}`);
            }

            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: { hostName, start, end, host } as Record<string, unknown>,
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
        `An Observability host attachment. The host name and time range are provided - use the ${GET_HOST_DETAILS_TOOL_ID} tool to fetch the full host details.`
      ),
  };
}
