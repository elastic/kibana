/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { chatCompleteJson } from './models';
import type { DecisionCase } from './prompts';

export interface JudgeVerdict {
  same: boolean;
  reasoning: string;
}

const SYSTEM = `You judge a SIEM rule migration step. Given a rule and a list of candidates, two systems each picked one candidate, or "no_match".
The reference answer is correct by definition. Decide whether the candidate answer produces the same output as the reference: the same pick, or "no_match" for both.
Reply only with a JSON object: {"same": true|false, "reasoning": "<one or two sentences>"}.`;

export const judge = async (
  kbnClient: KbnClient,
  connectorId: string,
  {
    decisionCase,
    reference,
    candidate,
  }: {
    decisionCase: DecisionCase;
    reference: { choice: string; summary?: string };
    candidate: { choice: string; confidence: number; probabilities: Record<string, number> };
  }
): Promise<JudgeVerdict & { latencyMs: number }> => {
  const { answer, latencyMs } = await chatCompleteJson<Partial<JudgeVerdict>>(
    kbnClient,
    connectorId,
    [
      new SystemMessage(SYSTEM),
      new HumanMessage(
        [
          `<rule_and_candidates>\n${decisionCase.decision.input}\n</rule_and_candidates>`,
          `<choices>\n${JSON.stringify(decisionCase.choices, null, 2)}\n</choices>`,
          `<reference_answer>\n${JSON.stringify(reference, null, 2)}\n</reference_answer>`,
          `<candidate_answer>\n${JSON.stringify(candidate, null, 2)}\n</candidate_answer>`,
        ].join('\n\n')
      ),
    ]
  );
  if (typeof answer.same !== 'boolean') {
    throw new Error(`Judge returned no boolean "same": ${JSON.stringify(answer)}`);
  }
  return { same: answer.same, reasoning: String(answer.reasoning ?? ''), latencyMs };
};
