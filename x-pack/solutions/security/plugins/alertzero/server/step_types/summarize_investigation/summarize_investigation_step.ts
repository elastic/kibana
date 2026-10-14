/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExecuteAgentParams, ExecuteAgentResult } from '@kbn/agent-builder-server';
import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { summarizeInvestigationStepCommonDefinition } from '../../../common/step_types/summarize_investigation';
import {
  runInvestigationSummary,
  type InvestigationConversationReader,
} from '../../services/investigation_summary/run_summary';

export interface SummarizeInvestigationStepDependencies {
  getConversationClient: (request: KibanaRequest) => Promise<InvestigationConversationReader>;
  executeAgent: (params: ExecuteAgentParams) => Promise<ExecuteAgentResult>;
  resolveConnectorId?: (request: KibanaRequest) => Promise<string | undefined>;
}

export const getSummarizeInvestigationStepDefinition = (
  deps: SummarizeInvestigationStepDependencies
) =>
  createServerStepDefinition({
    ...summarizeInvestigationStepCommonDefinition,
    handler: async (context) => {
      try {
        const input = summarizeInvestigationStepCommonDefinition.inputSchema.parse(context.input);
        const request = context.contextManager.getFakeRequest();
        if (!request) {
          throw new ExecutionError({
            type: 'ApiError',
            message: 'No request available in workflow context',
          });
        }
        const output = await runInvestigationSummary({
          request,
          conversationId: input.conversation_id,
          deps,
        });
        return { output };
      } catch (error) {
        if (error instanceof ExecutionError) {
          throw error;
        }
        throw new ExecutionError({
          type: 'ApiError',
          message: error instanceof Error ? error.message : 'Failed to summarize investigation',
        });
      }
    },
  });
