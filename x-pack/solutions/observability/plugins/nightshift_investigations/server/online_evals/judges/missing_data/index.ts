/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole } from '@kbn/inference-common';
import type { RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { renderTraceMessages, roundEvidenceSchema } from '../render_round';
import { capExplanation, runConversationJudge } from '../run_judge';
import {
  MAX_MISSING_DATA,
  MISSING_DATA_SYSTEM_PROMPT,
  buildScoringRequest,
  missingDataOutputSchema,
  missingDataTool,
} from './prompt';

/** One line a gap's explanation is made of. It is only sent where explanations are allowed. */
const describeGap = ({
  what,
  source,
  would_decide: wouldDecide,
}: {
  what: string;
  source?: string;
  would_decide?: string;
}): string =>
  [source ? `${what} (${source})` : what, wouldDecide ? `would decide: ${wouldDecide}` : undefined]
    .filter((part): part is string => part !== undefined)
    .join('; ');

export const missingDataJudge: RegisteredEvaluatorDefinition = {
  name: 'nightshift_missing_data',
  version: '1.0.0',
  kind: 'llm',
  direction: 'minimize',
  description:
    'Reference-free: the data an investigation was missing to confirm its cause, and why: no access, not retained, not collected or not queried.',
  evidenceSchema: roundEvidenceSchema,
  async evaluate({ round, inferenceClient }) {
    if (!inferenceClient) {
      throw new Error('Inference client is required for the nightshift_missing_data judge');
    }

    const { messages, omittedToolCalls } = renderTraceMessages(round);
    const { gaps } = await runConversationJudge({
      inferenceClient,
      system: MISSING_DATA_SYSTEM_PROMPT,
      messages: [
        ...messages,
        { role: MessageRole.User, content: buildScoringRequest({ omittedToolCalls }) },
      ],
      tool: missingDataTool,
      outputSchema: missingDataOutputSchema,
    });

    const reported = gaps.slice(0, MAX_MISSING_DATA);
    return {
      scores: [
        {
          name: 'missing_data_gaps',
          score: reported.length,
          label: `${reported.length} ${reported.length === 1 ? 'gap' : 'gaps'}`,
          explanation: 'Gaps in the data that kept the investigation from confirming its cause',
        },
        // One score per gap: the label is the reason, so a terms aggregation counts gaps by reason.
        ...reported.map((gap) => ({
          name: 'missing_data_gap',
          score: 1,
          label: gap.why,
          explanation: capExplanation(describeGap(gap)),
        })),
      ],
    };
  },
};
