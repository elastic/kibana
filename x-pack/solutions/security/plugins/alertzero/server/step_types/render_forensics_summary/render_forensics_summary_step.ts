/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { renderForensicsSummaryStepCommonDefinition } from '../../../common/step_types/render_forensics_summary';
import {
  runForensicsSummary,
  type RunForensicsSummaryDeps,
} from '../../services/forensics_summary/run_forensics_summary';

export type RenderForensicsSummaryStepDependencies = RunForensicsSummaryDeps;

export const getRenderForensicsSummaryStepDefinition = (
  deps: RenderForensicsSummaryStepDependencies
) =>
  createServerStepDefinition({
    ...renderForensicsSummaryStepCommonDefinition,
    handler: async (context) => {
      try {
        const input = renderForensicsSummaryStepCommonDefinition.inputSchema.parse(context.input);
        const request = context.contextManager.getFakeRequest();
        if (!request) {
          throw new ExecutionError({
            type: 'ApiError',
            message: 'No request available in workflow context',
          });
        }
        const { spaceId } = context.contextManager.getContext().workflow;
        const output = await runForensicsSummary({
          request,
          spaceId,
          conversationId: input.conversation_id,
          esClient: context.contextManager.getScopedEsClient(),
          abortSignal: context.abortSignal,
          deps,
        });
        return { output };
      } catch (error) {
        if (error instanceof ExecutionError) {
          throw error;
        }
        throw new ExecutionError({
          type: 'ApiError',
          message: error instanceof Error ? error.message : 'Failed to render forensics summary',
        });
      }
    },
  });
