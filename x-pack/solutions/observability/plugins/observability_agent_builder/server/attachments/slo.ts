/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { Logger } from '@kbn/core/server';
import type { ResolverTypeDefinition } from '@kbn/agent-context-layer-plugin/server';
import { OBSERVABILITY_SLO_ATTACHMENT_TYPE_ID } from '../../common';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';
import { observabilityAttachmentDataSchema } from './observability_attachment_data_schema';

const GET_SLO_DETAILS_TOOL_ID = 'get_slo_details';

const sloDataSchema = observabilityAttachmentDataSchema.extend({
  sloId: z.string(),
  sloInstanceId: z.string().optional(),
  remoteName: z.string().optional(),
});

export type SloAttachmentData = z.infer<typeof sloDataSchema>;

export function createSloAttachmentType({
  logger,
  dataRegistry,
}: {
  logger: Logger;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
}): ResolverTypeDefinition<typeof OBSERVABILITY_SLO_ATTACHMENT_TYPE_ID, SloAttachmentData> {
  return {
    id: OBSERVABILITY_SLO_ATTACHMENT_TYPE_ID,
    validate: (input) => {
      const parsed = sloDataSchema.safeParse(input);
      if (parsed.success) {
        return { valid: true, data: parsed.data };
      }
      return { valid: false, error: parsed.error.message };
    },
    format: (item) => ({
      type: 'text',
      value: `Observability SLO ID: ${item.data.sloId}. Use the ${GET_SLO_DETAILS_TOOL_ID} tool to fetch full SLO information.`,
    }),
    getBoundedTools: (item) => {
      const { sloId, sloInstanceId, remoteName } = item.data;
      return [
        {
          id: GET_SLO_DETAILS_TOOL_ID,
          description: `Fetch the full details for SLO ${sloId}.`,
          type: ToolType.builtin,
          schema: z.object({}),
          confirmation: { askUser: 'never' },
          handler: async (_args, abContext) => {
            const sloDetails = await dataRegistry.getData('sloDetails', {
              request: abContext.request,
              sloId,
              sloInstanceId,
              remoteName,
            });

            if (!sloDetails) {
              throw new Error(`SLO details not found for ${sloId}`);
            }

            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: sloDetails as Record<string, unknown>,
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
        `An Observability SLO attachment. The SLO ID is provided - use the ${GET_SLO_DETAILS_TOOL_ID} tool to fetch the full SLO information.`
      ),
  };
}
