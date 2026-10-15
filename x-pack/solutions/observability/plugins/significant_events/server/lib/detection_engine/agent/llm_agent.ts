/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceClient, ToolChoice } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import { ENGINE_SEVERITIES, EVIDENCE_VERDICTS } from '../../../../common/detection_engine/types';
import type { AgentAnswer, AgentCase, AgentUsage, IDiscoveryAgent } from './types';

const TOOL_NAME = 'submit_assessment';
const TIMEOUT_MS = 90_000;

const SYSTEM_PROMPT = `You are the discovery step of a detection engine for a customer's system.
Code has already decided that a detection is above its own normal, and has prepared a bounded case:
the detection, evidence rows with ids, the event it may belong to, customer alerts firing at the same time,
related services and notes from past corrections.

Your job, and nothing else:
1. Give each evidence item a verdict: confirms (rows directly show the problem), refutes (rows show it is healthy),
   off_topic (rows show something unrelated), inconclusive (cannot tell, no rows, or an error).
2. If the case has a join_proposal, confirm it only when the evidence suggests one problem; otherwise veto it.
3. Rate severity from measured impact: critical, high, medium or low. Do not escalate when in doubt.
4. Write a short title and a plain-language summary of what is wrong, where, and since when.

You never set a status, never create or remove events, and never cite evidence ids that are not in the case.
Answer only by calling ${TOOL_NAME}.`;

const ASSESSMENT_SCHEMA = {
  type: 'object',
  properties: {
    join_decision: {
      type: 'string',
      enum: ['confirm', 'veto'],
      description: 'Only when the case has a join_proposal.',
    },
    join_reason: { type: 'string', description: 'Why the join was confirmed or vetoed.' },
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          evidence_id: { type: 'string' },
          verdict: { type: 'string', enum: [...EVIDENCE_VERDICTS] },
          note: { type: 'string', description: 'What the rows show, in one sentence.' },
        },
        required: ['evidence_id', 'verdict', 'note'],
      },
    },
    severity: { type: 'string', enum: [...ENGINE_SEVERITIES] },
    title: { type: 'string', description: 'At most 80 characters.' },
    summary: { type: 'string', description: 'Two to four sentences.' },
  },
  required: ['verdicts', 'severity', 'title', 'summary'],
} as const;

/** The discovery agent backed by a model. One call, one forced tool, one answer. */
export function createLlmAgent({
  inferenceClient,
  connectorId,
}: {
  inferenceClient: InferenceClient;
  connectorId: string;
}): IDiscoveryAgent {
  // Accumulates across this agent's calls in one run; the engine prices the total.
  const used: AgentUsage = { prompt: 0, cached: 0, completion: 0 };
  return {
    kind: 'llm',
    connectorId,

    usage: () => ({ ...used }),

    async assess(agentCase: AgentCase): Promise<AgentAnswer> {
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), TIMEOUT_MS);
      try {
        const response = await inferenceClient.chatComplete({
          connectorId,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: MessageRole.User,
              content: `Assess this case:\n${JSON.stringify(agentCase, null, 2)}`,
            },
          ],
          tools: {
            [TOOL_NAME]: {
              description: 'Submit the assessment of the case.',
              schema: ASSESSMENT_SCHEMA,
            },
          },
          toolChoice: { function: TOOL_NAME } as ToolChoice,
          abortSignal: abortController.signal,
        });
        used.prompt += response.tokens?.prompt ?? 0;
        used.cached += response.tokens?.cached ?? 0;
        used.completion += (response.tokens?.completion ?? 0) + (response.tokens?.thinking ?? 0);
        const toolCall = response.toolCalls?.[0];
        if (!toolCall) {
          throw new Error('The model answered without calling the assessment tool');
        }
        return toolCall.function.arguments as unknown as AgentAnswer;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
