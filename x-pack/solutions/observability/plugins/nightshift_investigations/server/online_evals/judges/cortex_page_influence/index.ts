/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { roundEvidenceSchema, truncate } from '../render_round';
import { capExplanation, gradeToScore, runJudge } from '../run_judge';
import { collectCortexPageReads } from '../cortex_pages';
import {
  CORTEX_PAGE_INFLUENCE_TOOL_NAME,
  MAX_JUDGE_INPUT_CHARS,
  cortexPageInfluenceOutputSchema,
  cortexPageInfluencePrompt,
} from './prompt';

export const cortexPageInfluenceJudge: RegisteredEvaluatorDefinition = {
  name: 'nightshift_cortex_page_influence',
  version: '1.0.0',
  kind: 'llm',
  direction: 'maximize',
  description:
    'Reference-free: which of the Cortex pages an investigation read its final answer used, how they shaped it, and how much more they could have.',
  evidenceSchema: roundEvidenceSchema,
  async evaluate({ round, inferenceClient }) {
    if (!inferenceClient) {
      throw new Error(
        'Inference client is required for the nightshift_cortex_page_influence judge'
      );
    }

    const pages = collectCortexPageReads(round);
    if (pages.length === 0) {
      return { scores: [], notApplicable: { reason: 'no Cortex pages were read' } };
    }

    const perPageChars = Math.floor(MAX_JUDGE_INPUT_CHARS / pages.length);
    const output = await runJudge({
      inferenceClient,
      prompt: cortexPageInfluencePrompt,
      input: {
        task: truncate(round.input.message, MAX_JUDGE_INPUT_CHARS),
        pages: pages
          .map(
            ({ id, content }) => `## ${id}\n${truncate(content || '[no content]', perPageChars)}`
          )
          .join('\n\n'),
        answer: truncate(round.response.message, MAX_JUDGE_INPUT_CHARS),
      },
      toolName: CORTEX_PAGE_INFLUENCE_TOOL_NAME,
      outputSchema: cortexPageInfluenceOutputSchema,
    });

    // The judge may echo ids it was not given; count only pages that were read.
    const readIds = new Set(pages.map(({ id }) => id));
    const usedIds = [...new Set(output.pages_used)].filter((id) => readIds.has(id));

    return {
      scores: [
        {
          name: 'cortex_pages_referenced',
          score: usedIds.length,
          label: `${usedIds.length}/${pages.length} pages`,
          explanation: capExplanation(usedIds.join(', ') || 'none'),
          metadata: { page_ids: usedIds, pages_read: pages.length },
        },
        {
          name: 'cortex_page_influence',
          score: gradeToScore(output.influence),
          label: `${output.influence}/3`,
          explanation: capExplanation(output.influence_reasoning),
        },
        {
          name: 'cortex_page_missed_influence',
          score: gradeToScore(output.missed_influence),
          label: `${output.missed_influence}/3`,
          explanation: capExplanation(output.missed_influence_reasoning),
          direction: 'minimize',
        },
      ],
    };
  },
};
