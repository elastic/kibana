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
import type { ObservabilityAgentBuilderCoreSetup } from '../types';
import { OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID } from '../../common';
import { getLogDocumentById } from '../routes/ai_insights/get_log_document_by_id';

const logDataSchema = z.object({
  id: z.string(),
  index: z.string(),
});

export type LogAttachmentData = z.infer<typeof logDataSchema>;

export function createLogAttachmentType({
  core,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  logger: Logger;
}): AttachmentTypeDefinition<typeof OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID, LogAttachmentData> {
  return {
    id: OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID,
    validate: (input) => {
      const parsed = logDataSchema.safeParse(input);
      if (parsed.success) {
        return { valid: true, data: parsed.data };
      }
      return { valid: false, error: parsed.error.message };
    },
    format: async (attachment, context) => {
      const { index, id } = attachment.data;

      try {
        const [coreStart] = await core.getStartServices();
        const esClient = coreStart.elasticsearch.client.asScoped(context.request);

        const logEntry = await getLogDocumentById({
          esClient: esClient.asCurrentUser,
          index,
          id,
        });

        if (!logEntry) {
          return {
            getRepresentation: () => ({
              type: 'text',
              value: `Log document not found for ${index}:${id}`,
            }),
          };
        }

        return {
          getRepresentation: () => ({
            type: 'text',
            value: JSON.stringify(logEntry, null, 2),
          }),
        };
      } catch (error) {
        logger.error(`Failed to fetch log document for attachment: ${error?.message}`);
        logger.debug(error);

        return {
          getRepresentation: () => ({
            type: 'text',
            value: `Failed to fetch log document ${index}:${id}: ${error?.message}`,
          }),
        };
      }
    },
    getTools: () => [],
    getAgentDescription: () =>
      dedent(`An Observability Log attachment containing the full log document information.`),
  };
}
