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
import { OBSERVABILITY_TRANSACTION_ATTACHMENT_TYPE_ID } from '../../common';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';
import { observabilityAttachmentDataSchema } from './observability_attachment_data_schema';

const GET_TRANSACTION_DETAILS_TOOL_ID = 'get_transaction_details';

const transactionDataSchema = observabilityAttachmentDataSchema.extend({
  serviceName: z.string(),
  transactionName: z.string(),
  transactionType: z.string(),
  traceId: z.string().optional(),
  transactionId: z.string().optional(),
  start: z.string(),
  end: z.string(),
});

export type TransactionAttachmentData = z.infer<typeof transactionDataSchema>;

export function createTransactionAttachmentType({
  logger,
  dataRegistry,
}: {
  logger: Logger;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
}): ResolverTypeDefinition<
  typeof OBSERVABILITY_TRANSACTION_ATTACHMENT_TYPE_ID,
  TransactionAttachmentData
> {
  return {
    id: OBSERVABILITY_TRANSACTION_ATTACHMENT_TYPE_ID,
    validate: (input) => {
      const parsed = transactionDataSchema.safeParse(input);
      if (parsed.success) {
        return { valid: true, data: parsed.data };
      }
      return { valid: false, error: parsed.error.message };
    },
    format: (item) => {
      const { serviceName, transactionName, transactionType } = item.data;
      return {
        type: 'text',
        value: `Observability APM Transaction: ${transactionName} (${transactionType}) in service ${serviceName}. Use the ${GET_TRANSACTION_DETAILS_TOOL_ID} tool to fetch full transaction details.`,
      };
    },
    getBoundedTools: (item) => {
      const { serviceName, transactionName, transactionType, transactionId, traceId, start, end } =
        item.data;
      return [
        {
          id: GET_TRANSACTION_DETAILS_TOOL_ID,
          description: `Fetch the full transaction details for transaction "${transactionName}" (${transactionType}) in service ${serviceName}.`,
          type: ToolType.builtin,
          schema: z.object({}),
          confirmation: { askUser: 'never' },
          handler: async (_args, abContext) => {
            const transactionDetails = await dataRegistry.getData('apmTransactionDetails', {
              request: abContext.request,
              serviceName,
              transactionName,
              transactionId,
              traceId,
              start,
              end,
            });

            if (!transactionDetails?.transaction) {
              throw new Error(`Transaction details not found for ${transactionName}`);
            }

            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: transactionDetails as Record<string, unknown>,
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
        `An Observability APM transaction attachment. The service name, transaction name, transaction type and time range are provided - use the ${GET_TRANSACTION_DETAILS_TOOL_ID} tool to fetch the full transaction details.`
      ),
  };
}
