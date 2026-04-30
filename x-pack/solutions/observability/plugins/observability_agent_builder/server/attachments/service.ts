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
import { OBSERVABILITY_SERVICE_ATTACHMENT_TYPE_ID } from '../../common';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';
import { observabilityAttachmentDataSchema } from './observability_attachment_data_schema';

const GET_SERVICE_DETAILS_TOOL_ID = 'get_service_details';

const serviceDataSchema = observabilityAttachmentDataSchema.extend({
  serviceName: z.string(),
  environment: z.string(),
  start: z.string(),
  end: z.string(),
});

export type ServiceAttachmentData = z.infer<typeof serviceDataSchema>;

export function createServiceAttachmentType({
  logger,
  dataRegistry,
}: {
  logger: Logger;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
}): ResolverTypeDefinition<
  typeof OBSERVABILITY_SERVICE_ATTACHMENT_TYPE_ID,
  ServiceAttachmentData
> {
  return {
    id: OBSERVABILITY_SERVICE_ATTACHMENT_TYPE_ID,
    validate: (input) => {
      const parsed = serviceDataSchema.safeParse(input);
      if (parsed.success) {
        return { valid: true, data: parsed.data };
      }
      return { valid: false, error: parsed.error.message };
    },
    format: (item) => ({
      type: 'text',
      value: `Observability Service Name: ${item.data.serviceName}. Use the ${GET_SERVICE_DETAILS_TOOL_ID} tool to fetch the full service details.`,
    }),
    getBoundedTools: (item) => {
      const { serviceName, environment, start, end } = item.data;
      return [
        {
          id: GET_SERVICE_DETAILS_TOOL_ID,
          description: `Fetch the full service details for service ${serviceName}.`,
          type: ToolType.builtin,
          schema: z.object({}),
          confirmation: { askUser: 'never' },
          handler: async (_args, abContext) => {
            const serviceDetails = await dataRegistry.getData('apmServiceSummary', {
              request: abContext.request,
              serviceName,
              serviceEnvironment: environment,
              start,
              end,
            });

            if (!serviceDetails) {
              throw new Error(`Service details not found for ${serviceName}`);
            }

            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: serviceDetails as Record<string, unknown>,
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
        `An Observability service attachment. The service name, environment and the time range is provided - use the ${GET_SERVICE_DETAILS_TOOL_ID} tool to fetch the full service details.`
      ),
  };
}
