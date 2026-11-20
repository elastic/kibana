/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSchema } from '@kbn/inference-common';
import { z, lazySchema } from '@kbn/zod/v4';
import { gradeSchema } from '../run_judge';
import { withIdentifierRule } from '../with_identifier_rule';
import systemPromptText from './system_prompt.text';

export const WIKI_PAGE_INFLUENCE_TOOL_NAME = 'score_wiki_page_influence';

/** Generous bound on judge text; explanations are capped separately before persisting. */
const MAX_JUDGE_TEXT_LENGTH = 100_000;

/** The names the system prompt gives each 0-3 level, in grade order. */
export const INFLUENCE_LEVELS = ['none', 'incidental', 'supporting', 'decisive'] as const;
export const MISSED_INFLUENCE_LEVELS = ['none', 'minor', 'significant', 'critical'] as const;

export const WIKI_PAGE_INFLUENCE_SYSTEM_PROMPT: string = withIdentifierRule(systemPromptText);

export const wikiPageInfluenceOutputSchema = lazySchema(() =>
  z.object({
    pages_used: z.array(z.string().max(512)).max(1_000),
    influence: gradeSchema,
    influence_reasoning: z.string().max(MAX_JUDGE_TEXT_LENGTH),
    missed_influence: gradeSchema,
    missed_influence_reasoning: z.string().max(MAX_JUDGE_TEXT_LENGTH),
  })
);

export type WikiPageInfluenceOutput = z.infer<typeof wikiPageInfluenceOutputSchema>;

export const wikiPageInfluenceTool: {
  name: string;
  description: string;
  schema: ToolSchema;
} = {
  name: WIKI_PAGE_INFLUENCE_TOOL_NAME,
  description: 'Return how the Wiki pages influenced the answer and how much more they could have.',
  schema: {
    type: 'object',
    properties: {
      pages_used: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Ids of the pages whose content the final answer relies on, named or paraphrased. Use only the listed ids.',
      },
      influence: {
        type: 'number',
        description:
          'Integer 0-3: how much the pages actually shaped the investigation and answer.',
      },
      influence_reasoning: {
        type: 'string',
        description:
          'One or two sentences: how the pages shaped the investigation, or that they did not.',
      },
      missed_influence: {
        type: 'number',
        description:
          'Integer 0-3: how much useful page content the investigation and answer left unused or contradicted.',
      },
      missed_influence_reasoning: {
        type: 'string',
        description: 'One or two sentences: what the pages offered that could have been used.',
      },
    },
    required: [
      'pages_used',
      'influence',
      'influence_reasoning',
      'missed_influence',
      'missed_influence_reasoning',
    ],
  },
};

/**
 * The human message that closes the conversation and asks for the scores. Lists the pages read
 * so the judge can name them by id.
 */
export const buildScoringRequest = ({
  pageIds,
  omittedToolCalls,
}: {
  pageIds: readonly string[];
  omittedToolCalls: number;
}): string =>
  [
    'The conversation above is the investigation to evaluate.',
    omittedToolCalls > 0
      ? `${omittedToolCalls} later tool calls were left out to fit your context.`
      : undefined,
    `The agent opened these Wiki pages. Their text is in the tool results above:\n${pageIds
      .map((id) => `- ${id}`)
      .join('\n')}`,
    `Score how these pages influenced the investigation by calling ${WIKI_PAGE_INFLUENCE_TOOL_NAME}.`,
  ]
    .filter((part): part is string => part !== undefined)
    .join('\n\n');
