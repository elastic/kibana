/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { findOrCreateInvestigationStepCommonDefinition } from '../../../common/step_types/find_or_create_investigation';
import { runFindOrCreateInvestigation } from './run_find_or_create_investigation';

export interface FindOrCreateInvestigationStepDependencies {
  getConversations: () => AgentBuilderPluginStart['conversations'];
}

export const getFindOrCreateInvestigationStepDefinition = ({
  getConversations,
}: FindOrCreateInvestigationStepDependencies) =>
  createServerStepDefinition({
    ...findOrCreateInvestigationStepCommonDefinition,
    handler: async (context) => {
      try {
        const input = findOrCreateInvestigationStepCommonDefinition.inputSchema.parse(
          context.input
        );
        const request = context.contextManager.getFakeRequest();
        const conversations = getConversations();
        const conversationClient = await conversations.getScopedClient({ request });

        const output = await runFindOrCreateInvestigation(input, { conversationClient });

        return { output };
      } catch (error) {
        if (error instanceof ExecutionError) {
          throw error;
        }
        throw new ExecutionError({
          type: 'ApiError',
          message:
            error instanceof Error ? error.message : 'Failed to find-or-create Investigation',
        });
      }
    },
  });
