/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole } from '@kbn/inference-common';
import type { RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { renderTraceMessages, roundEvidenceSchema } from '../render_round';
import { capExplanation, gradeToScore, runConversationJudge } from '../run_judge';
import { collectCortexPageReads } from '../cortex_pages';
import {
  CORTEX_PAGE_INFLUENCE_SYSTEM_PROMPT,
  cortexPageInfluenceOutputSchema,
  cortexPageInfluenceTool,
  buildScoringRequest,
  INFLUENCE_LEVELS,
  MISSED_INFLUENCE_LEVELS,
} from './prompt';

export const cortexPageInfluenceJudge: RegisteredEvaluatorDefinition = {
  name: 'nightshift_cortex_page_influence',
  version: '1.0.0',
  kind: 'llm',
  direction: 'maximize',
  description:
    'Reference-free: which of the Cortex pages an investigation read its final answer used, how they shaped the investigation, and how much more they could have.',
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

    const { messages, omittedToolCalls } = renderTraceMessages(round);
    const output = await runConversationJudge({
      inferenceClient,
      system: CORTEX_PAGE_INFLUENCE_SYSTEM_PROMPT,
      messages: [
        ...messages,
        {
          role: MessageRole.User,
          content: buildScoringRequest({
            pageIds: pages.map(({ id }) => id),
            omittedToolCalls,
          }),
        },
      ],
      tool: cortexPageInfluenceTool,
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
          name: 'cortex_pages_referenced_ratio',
          score: Math.round((usedIds.length / pages.length) * 1000) / 1000,
          label: `${usedIds.length}/${pages.length} pages`,
          explanation: 'Share of the pages read that the answer relies on',
          metadata: { page_ids: usedIds, pages_read: pages.length },
        },
        {
          name: 'cortex_page_influence',
          score: gradeToScore(output.influence),
          label: `${INFLUENCE_LEVELS[output.influence]} (${output.influence}/3)`,
          explanation: capExplanation(output.influence_reasoning),
        },
        {
          name: 'cortex_page_missed_influence',
          score: gradeToScore(output.missed_influence),
          label: `${MISSED_INFLUENCE_LEVELS[output.missed_influence]} (${
            output.missed_influence
          }/3)`,
          explanation: capExplanation(output.missed_influence_reasoning),
          direction: 'minimize',
        },
      ],
    };
  },
};
