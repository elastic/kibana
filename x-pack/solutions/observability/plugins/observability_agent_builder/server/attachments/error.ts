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
import { OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID } from '../../common';
import type { ObservabilityAgentBuilderCoreSetup } from '../types';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';

const GET_ERROR_DETAILS_TOOL_ID = 'get_error_details';

const errorDataSchema = z.object({
  errorId: z.string(),
  serviceName: z.string().optional(),
  environment: z.string().nullable().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
});

export type ErrorAttachmentData = z.infer<typeof errorDataSchema>;

export function createErrorAttachmentType({
  core,
  logger,
  dataRegistry,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  logger: Logger;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
}): AttachmentTypeDefinition<typeof OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID, ErrorAttachmentData> {
  return {
    id: OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID,
    validate: (input) => {
      const parsed = errorDataSchema.safeParse(input);
      if (parsed.success) {
        return { valid: true, data: parsed.data };
      }
      return { valid: false, error: parsed.error.message };
    },
    format: (attachment) => {
      const { errorId, serviceName = '', environment = '', start = '', end = '' } = attachment.data;

      return {
        getRepresentation: () => ({
          type: 'text',
          value: `Observability APM Error ID: ${errorId}. Use the ${GET_ERROR_DETAILS_TOOL_ID} tool to fetch full error information.`,
        }),
        getBoundedTools: () => [
          {
            id: GET_ERROR_DETAILS_TOOL_ID,
            type: ToolType.builtin,
            description: `Fetch the full error information for error ${errorId}.`,
            schema: z.object({}),
            handler: async (_args, context) => {
              try {
                const errorDetails = await dataRegistry.getData('apmErrorDetails', {
                  request: context.request,
                  errorId,
                  serviceName,
                  start,
                  end,
                  serviceEnvironment: environment ?? '',
                });

                return {
                  results: [
                    {
                      type: ToolResultType.other,
                      data: errorDetails as Record<string, unknown>,
                    },
                  ],
                };
              } catch (error) {
                logger.error(`Failed to fetch error details for attachment: ${error?.message}`);
                logger.debug(error);

                return {
                  results: [
                    {
                      type: ToolResultType.error,
                      data: {
                        message: `Failed to fetch error details: ${error.message}`,
                        stack: error.stack,
                      },
                    },
                  ],
                };
              }
            },
          },
        ],
      };
    },
    getTools: () => [],
    getAgentDescription: () =>
      dedent(
        `An Observability APM error attachment. The error ID is provided - use the ${GET_ERROR_DETAILS_TOOL_ID} tool to fetch the full error information.`
      ),
  };
}
