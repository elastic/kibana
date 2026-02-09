/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import dedent from 'dedent';
import type { Logger } from '@kbn/core/server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { OBSERVABILITY_SLO_ATTACHMENT_TYPE_ID } from '../../common';
import type { ObservabilityAgentBuilderCoreSetup } from '../types';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';

const GET_SLO_DETAILS_TOOL_ID = 'get_slo_details';

const sloDataSchema = z.object({
  sloId: z.string(),
});

export type SloAttachmentData = z.infer<typeof sloDataSchema>;

export function createSloAttachmentType({
  core,
  logger,
  dataRegistry,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  logger: Logger;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
}): AttachmentTypeDefinition<typeof OBSERVABILITY_SLO_ATTACHMENT_TYPE_ID, SloAttachmentData> {
  return {
    id: OBSERVABILITY_SLO_ATTACHMENT_TYPE_ID,
    validate: (input) => {
      const parsed = sloDataSchema.safeParse(input);
      if (parsed.success) {
        return { valid: true, data: parsed.data };
      }
      return { valid: false, error: parsed.error.message };
    },
    format: (attachment) => {
      const { sloId } = attachment.data;

      return {
        getRepresentation: () => ({
          type: 'text',
          value: `Observability SLO ID: ${sloId}. Use the ${GET_SLO_DETAILS_TOOL_ID} tool to fetch full SLO information.`,
        }),
        getBoundedTools: () => [
          {
            id: GET_SLO_DETAILS_TOOL_ID,
            type: ToolType.builtin,
            description: `Fetch the full SLO information for SLO ${sloId}.`,
            schema: z.object({}),
            handler: async (_args, context) => {
              return {
                results: [
                  {
                    type: ToolResultType.other,
                    data: {},
                  },
                ],
              };
            },
          },
        ],
      };
    },
    getTools: () => [],
    getAgentDescription: () =>
      dedent(
        `An Observability SLO attachment. The SLO ID is provided - use the ${GET_SLO_DETAILS_TOOL_ID} tool to fetch the full SLO information.`
      ),
  };
}
