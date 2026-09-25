/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { findOrCreateInvestigationStepCommonDefinition } from '../../../common/step_types/find_or_create_investigation';
import { loadReportHuntContext } from '../../services/watches/hunt/common/load_report_context';
import { runFindOrCreateInvestigation } from './run_find_or_create_investigation';

export interface FindOrCreateInvestigationStepDependencies {
  getConversations: () => AgentBuilderPluginStart['conversations'];
  /**
   * Internal-user client for `.kibana-threat-reports`: the index is plugin-owned
   * and hidden, so the workflow's own identity cannot read it (same rule as the
   * hunt coordinator's `reportsEsClient`). Optional so the step still runs, with
   * a report-id-only trigger message, where no such client is wired.
   */
  getReportsEsClient?: () => ElasticsearchClient;
  logger?: Logger;
}

export const getFindOrCreateInvestigationStepDefinition = ({
  getConversations,
  getReportsEsClient,
  logger,
}: FindOrCreateInvestigationStepDependencies) =>
  createServerStepDefinition({
    ...findOrCreateInvestigationStepCommonDefinition,
    handler: async (context) => {
      try {
        const input = findOrCreateInvestigationStepCommonDefinition.inputSchema.parse(
          context.input
        );
        const spaceId = context.contextManager.getContext().workflow.spaceId;
        const request = context.contextManager.getFakeRequest();
        const conversations = getConversations();
        const conversationClient = await conversations.getScopedClient({ request });

        const output = await runFindOrCreateInvestigation(
          { spaceId, reportId: input.reportId },
          {
            conversationClient,
            logger,
            ...(getReportsEsClient
              ? {
                  loadReport: () =>
                    loadReportHuntContext({
                      esClient: getReportsEsClient(),
                      spaceId,
                      reportId: input.reportId,
                    }),
                }
              : {}),
          }
        );

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
