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
import type { ObservabilityAgentBuilderCoreSetup } from '../types';
import { OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID } from '../../common';
import { getLogDocumentById } from '../routes/ai_insights/get_log_document_by_id';
import { observabilityAttachmentDataSchema } from './observability_attachment_data_schema';

const GET_LOG_DOCUMENT_TOOL_ID = 'get_log_document';

const logDataSchema = observabilityAttachmentDataSchema.extend({
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
}): ResolverTypeDefinition<typeof OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID, LogAttachmentData> {
  return {
    id: OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID,
    validate: (input) => {
      const parsed = logDataSchema.safeParse(input);
      if (parsed.success) {
        return { valid: true, data: parsed.data };
      }
      return { valid: false, error: parsed.error.message };
    },
    format: (item) => ({
      type: 'text',
      value: `Observability Log ID: ${item.data.index}:${item.data.id}. Use the ${GET_LOG_DOCUMENT_TOOL_ID} tool to fetch full log document.`,
    }),
    getBoundedTools: (item) => {
      const { index, id } = item.data;
      return [
        {
          id: GET_LOG_DOCUMENT_TOOL_ID,
          description: `Fetch the log document for ${index}:${id}.`,
          type: ToolType.builtin,
          schema: z.object({}),
          confirmation: { askUser: 'never' },
          handler: async (_args, abContext) => {
            const [coreStart] = await core.getStartServices();
            const esClient = coreStart.elasticsearch.client.asScoped(abContext.request);

            const logEntry = await getLogDocumentById({
              esClient: esClient.asCurrentUser,
              index,
              id,
            });

            if (!logEntry) {
              throw new Error(`Log document not found for ${index}:${id}`);
            }

            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: logEntry as Record<string, unknown>,
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
        `An Observability Log attachment. The log ID is provided - use the ${GET_LOG_DOCUMENT_TOOL_ID} tool to fetch the full log information.`
      ),
  };
}
