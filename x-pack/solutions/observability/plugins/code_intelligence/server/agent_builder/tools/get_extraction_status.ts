/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import {
  createErrorResult,
  createOtherResult,
  type BuiltinToolDefinition,
} from '@kbn/agent-builder-server';
import { z } from '@kbn/zod/v4';

import {
  CODE_INTELLIGENCE_TOOL_IDS,
  CODE_INTELLIGENCE_TOOL_TAGS,
  type CodeIntelligenceToolDependencies,
} from './types';

const schema = z.object({
  id: z.string().min(1).max(64).describe('Batch id returned by the start extraction tool.'),
});

export const createGetExtractionStatusTool = ({
  getServices,
}: CodeIntelligenceToolDependencies): BuiltinToolDefinition<typeof schema> => ({
  id: CODE_INTELLIGENCE_TOOL_IDS.getExtractionStatus,
  type: ToolType.builtin,
  description: `Reports the progress of 1 Code Intelligence extraction batch: the batch status (running, completed, failed, or partial) and, per repository, its status, resolved commit, entry counts, errors, and warnings.

When to use:
- After starting an extraction, to tell the user whether it finished.

New catalog entries become searchable about 1 second after a repository completes.`,
  schema,
  tags: CODE_INTELLIGENCE_TOOL_TAGS,
  annotations: {
    title: 'Get Code Intelligence Extraction Status',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ id }) => {
    const status = getServices().extractionService?.get(id);
    return {
      results: [
        status === undefined
          ? createErrorResult({
              message: `Extraction ${id} was not found. This Kibana instance tracks only the batches it started.`,
            })
          : createOtherResult(status),
      ],
    };
  },
});
