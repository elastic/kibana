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
import { OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID } from '../../common';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';
import { observabilityAttachmentDataSchema } from './observability_attachment_data_schema';

const GET_ERROR_DETAILS_TOOL_ID = 'get_error_details';

const errorDataSchema = observabilityAttachmentDataSchema.extend({
  errorId: z.string(),
  serviceName: z.string().optional(),
  environment: z.string().nullable().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
});

export type ErrorAttachmentData = z.infer<typeof errorDataSchema>;

export function createErrorAttachmentType({
  logger,
  dataRegistry,
}: {
  logger: Logger;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
}): ResolverTypeDefinition<typeof OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID, ErrorAttachmentData> {
  return {
    id: OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID,
    validate: (input) => {
      const parsed = errorDataSchema.safeParse(input);
      if (parsed.success) {
        return { valid: true, data: parsed.data };
      }
      return { valid: false, error: parsed.error.message };
    },
    format: (item) => ({
      type: 'text',
      value: `Observability APM Error ID: ${item.data.errorId}. Use the ${GET_ERROR_DETAILS_TOOL_ID} tool to fetch full error information.`,
    }),
    getBoundedTools: (item) => {
      const { errorId, serviceName = '', environment = '', start = '', end = '' } = item.data;
      return [
        {
          id: GET_ERROR_DETAILS_TOOL_ID,
          description: `Fetch the full error information for error ${errorId}.`,
          type: ToolType.builtin,
          schema: z.object({}),
          confirmation: { askUser: 'never' },
          handler: async (_args, abContext) => {
            const errorDetails = await dataRegistry.getData('apmErrorDetails', {
              request: abContext.request,
              errorId,
              serviceName,
              start,
              end,
              serviceEnvironment: environment ?? '',
            });

            if (!errorDetails) {
              throw new Error(`Error details not found for ${errorId}`);
            }

            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: errorDetails as Record<string, unknown>,
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
        `An Observability APM error attachment. The error ID is provided - use the ${GET_ERROR_DETAILS_TOOL_ID} tool to fetch the full error information.`
      ),
  };
}
