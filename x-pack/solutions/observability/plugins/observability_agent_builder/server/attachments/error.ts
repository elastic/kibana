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
import { OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID } from '../../common';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';

const errorDataSchema = z.object({
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
    format: async (attachment, context) => {
      const { errorId, serviceName = '', environment = '', start = '', end = '' } = attachment.data;

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
          getRepresentation: () => ({
            type: 'text',
            value: JSON.stringify(errorDetails, null, 2),
          }),
        };
      } catch (error) {
        logger.error(`Failed to fetch error details for attachment: ${error?.message}`);
        logger.debug(error);

        return {
          getRepresentation: () => ({
            type: 'text',
            value: `Failed to fetch error details for ${errorId}: ${error?.message}`,
          }),
        };
      }
    },
    getTools: () => [],
    getAgentDescription: () =>
      dedent(
        `An Observability APM error attachment containing the full error information including stack traces and context.`
      ),
  };
}
