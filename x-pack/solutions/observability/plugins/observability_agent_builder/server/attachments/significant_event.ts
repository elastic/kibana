/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import type { Logger } from '@kbn/core/server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ObservabilityAgentBuilderCoreSetup } from '../types';
import { OBSERVABILITY_SIGNIFICANT_EVENT_ATTACHMENT_TYPE_ID } from '../../common';
import { getSignificantEventByEventId } from '../utils/get_significant_event_by_event_id';
import { observabilityAttachmentDataSchema } from './observability_attachment_data_schema';

const GET_SIGNIFICANT_EVENT_TOOL_ID = 'get_significant_event';

const significantEventDataSchema = observabilityAttachmentDataSchema.extend({
  eventId: z.string(),
  index: z.string(),
});

export type SignificantEventAttachmentData = z.infer<typeof significantEventDataSchema>;

export function createSignificantEventAttachmentType({
  core,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  logger: Logger;
}): AttachmentTypeDefinition<
  typeof OBSERVABILITY_SIGNIFICANT_EVENT_ATTACHMENT_TYPE_ID,
  SignificantEventAttachmentData
> {
  return {
    id: OBSERVABILITY_SIGNIFICANT_EVENT_ATTACHMENT_TYPE_ID,
    validate: (input) => {
      const parsed = significantEventDataSchema.safeParse(input);
      if (parsed.success) {
        return { valid: true, data: parsed.data };
      }
      return { valid: false, error: parsed.error.message };
    },
    format: (attachment) => {
      const { eventId, index } = attachment.data;

      return {
        getRepresentation: () => ({
          type: 'text',
          value: `Observability significant event ID: ${eventId} (index: ${index}). Use the ${GET_SIGNIFICANT_EVENT_TOOL_ID} tool to fetch the full event payload.`,
        }),
        getBoundedTools: () => [
          {
            id: GET_SIGNIFICANT_EVENT_TOOL_ID,
            type: ToolType.builtin,
            description: `Fetch the significant event document for event_id ${eventId} from index ${index}.`,
            schema: z.object({}),
            handler: async (_args, context) => {
              try {
                const [coreStart] = await core.getStartServices();
                const esClient = coreStart.elasticsearch.client.asScoped(context.request);

                const doc = await getSignificantEventByEventId({
                  esClient: esClient.asCurrentUser,
                  eventId,
                  index: attachment.data.index,
                });

                if (!doc) {
                  return {
                    results: [
                      {
                        type: ToolResultType.error,
                        data: {
                          message: `Significant event not found for event_id ${eventId} in ${index}`,
                        },
                      },
                    ],
                  };
                }

                return {
                  results: [
                    {
                      type: ToolResultType.other,
                      data: doc,
                    },
                  ],
                };
              } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                const stack = error instanceof Error ? error.stack : undefined;
                logger.error(`Failed to fetch significant event for attachment: ${message}`);

                return {
                  results: [
                    {
                      type: ToolResultType.error,
                      data: {
                        message: `Failed to fetch significant event: ${message}`,
                        stack,
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
        `An Observability significant event attachment. The event_id (and optional Elasticsearch index) are provided — use the ${GET_SIGNIFICANT_EVENT_TOOL_ID} tool to load the mapped event payload (same structure as the significant events UI).`
      ),
  };
}
