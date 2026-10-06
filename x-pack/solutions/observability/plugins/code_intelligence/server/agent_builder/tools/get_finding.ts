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

import { getFinding } from '../../findings_service';
import {
  CODE_INTELLIGENCE_TOOL_IDS,
  CODE_INTELLIGENCE_TOOL_TAGS,
  type CodeIntelligenceToolDependencies,
} from './types';

const schema = z.object({ id: z.string().min(1).max(512) });

export const createGetFindingTool = ({
  findingsIndex,
}: CodeIntelligenceToolDependencies): BuiltinToolDefinition<typeof schema> => ({
  id: CODE_INTELLIGENCE_TOOL_IDS.getFinding,
  type: ToolType.builtin,
  description: `Reads a full Code Intelligence finding, including its evidence excerpts and review state. A finding is a source line a classifier flagged as exposing sensitive data (credentials, tokens, secrets, card data, personal data) in a log line, span attribute, or metric.

Use when the user asks to investigate, explain, or review a finding, or when a conversation attachment titled 'Code Intelligence finding' names an id. Never repeat a secret value.`,
  schema,
  tags: CODE_INTELLIGENCE_TOOL_TAGS,
  annotations: {
    title: 'Read a Code Intelligence Finding',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ id }, { esClient }) => {
    const finding = await getFinding(esClient.asCurrentUser, findingsIndex, id);
    return {
      results: [
        finding === undefined
          ? createErrorResult({
              message: 'Finding was not found.',
              metadata: { code: 'finding_not_found', id },
            })
          : createOtherResult({ finding }),
      ],
    };
  },
});
