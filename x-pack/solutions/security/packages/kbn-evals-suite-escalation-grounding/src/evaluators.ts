/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0. Use of this file is governed by the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { EscalationCase, EscalationTaskOutput } from './types';
import { groundTruthCorpus, hallucinatedSentences, plantedFactRecall } from './grading';

export const EVALUATOR_NAMES = {
  claimGrounding: 'ClaimGrounding',
  summaryRecall: 'SummaryPlantedFactRecall',
  chatRecall: 'ChatAnswerRecall',
  hallucination: 'HallucinationCount',
} as const;

interface CasePayload {
  c: EscalationCase;
}

const asCase = (expected: unknown): CasePayload => expected as CasePayload;
const asOutput = (output: unknown): EscalationTaskOutput => output as EscalationTaskOutput;

/**
 * LLM judge, run through the ClaimGrounding contract: split the escalation
 * summary into factual claims, then check each claim against the linked
 * investigations' ground truth. Score = grounded claims / total claims. This is
 * the only LLM in the suite; recall and hallucination are deterministic.
 *
 * Mirrors the ClaimGrounding evaluator added to the FP/TP suite in
 * elastic/kibana#295913: CODE-deterministic where labels are deterministic,
 * LLM only where judgment is genuinely needed, and a claim-free summary is
 * N/A rather than 1.
 */
export const createClaimGroundingEvaluator = ({
  inferenceClient,
  log,
}: {
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
}): Evaluator => ({
  name: EVALUATOR_NAMES.claimGrounding,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const { c } = asCase(expected);
    const { summary } = asOutput(output);
    if (!summary || summary.trim().length === 0) {
      return {
        score: 0,
        label: 'missing-summary',
        explanation: 'The escalation has no summary to ground.',
      };
    }

    const truth = groundTruthCorpus(c);

    const result = await inferenceClient.output({
      id: 'escalation-claim-grounding',
      system:
        'You are a strict grounding judge for security escalations. You split a summary into factual claims and verify each claim against the provided ground truth from linked investigations. You never use outside knowledge.',
      input: `Split the ESCALATION SUMMARY into atomic factual claims (at most 12, prefer the most specific ones). For each claim decide whether it is entailed by the GROUND TRUTH. A claim is grounded only if the ground truth (or a trivial paraphrase of it) states it. Anything the ground truth does not state — including stronger conclusions, merged actors, or invented specifics — is ungrounded.

GROUND TRUTH:
${truth}

ESCALATION SUMMARY:
${summary}`,
      schema: {
        type: 'object',
        properties: {
          claims: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                claim: { type: 'string' },
                grounded: { type: 'boolean' },
                evidence: { type: 'string' },
              },
              required: ['claim', 'grounded'],
            },
          },
        },
        required: ['claims'],
      } as const,
    });

    const claims =
      (result as { output?: { claims?: Array<{ claim: string; grounded: boolean }> } }).output
        ?.claims ?? [];
    if (claims.length === 0) {
      return {
        score: 0,
        label: 'no-claims-parsed',
        explanation: 'The judge returned no claims; treat as failure, not as vacuous success.',
      };
    }
    const grounded = claims.filter((claim) => claim.grounded).length;
    log.info(`ClaimGrounding [${c.id}]: ${grounded}/${claims.length} claims grounded`);
    return {
      score: grounded / claims.length,
      label: `${grounded}/${claims.length}`,
      explanation: claims.map((claim) => `${claim.grounded ? '✔' : '✘'} ${claim.claim}`).join('\n'),
      metadata: { claims },
    };
  },
});

/**
 * Deterministic: fraction of planted facts whose key appears in the summary.
 * The last-investigation fact is the canary for "the summary reflects EVERY
 * linked investigation".
 */
export const summaryPlantedFactRecall: Evaluator = {
  name: EVALUATOR_NAMES.summaryRecall,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const { c } = asCase(expected);
    const { summary } = asOutput(output);
    if (!summary || summary.trim().length === 0) {
      return { score: 0, label: 'missing-summary', explanation: 'No summary was produced.' };
    }
    const result = plantedFactRecall(summary, c.plantedFacts);
    return {
      score: result.score,
      label: `${result.hit.length}/${result.hit.length + result.missed.length}`,
      explanation:
        result.missed.length === 0
          ? 'All planted facts recalled.'
          : `Missed facts: ${result.missed.join(', ')} (f${result.missed
              .map((id) => c.plantedFacts.find((f) => f.id === id)?.investigation)
              .join(', f')})`,
      metadata: { hit: result.hit, missed: result.missed },
    };
  },
};

/**
 * Deterministic: for questions whose answer lives in exactly one linked
 * investigation, does the chat answer contain the expected key tokens? The
 * question set is built so every question qualifies (validated in the dataset
 * unit test).
 */
export const chatAnswerRecall: Evaluator = {
  name: EVALUATOR_NAMES.chatRecall,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const { c } = asCase(expected);
    const { answers } = asOutput(output);
    let hit = 0;
    let total = 0;
    const details: string[] = [];
    for (const q of c.questions) {
      const answer = answers?.[q.id];
      if (answer !== undefined) {
        // The expected answer's planted keys must appear; grade on the fact keys
        // the question depends on, which are unique to one investigation.
        const keys = q.factIds
          .map((id) => c.plantedFacts.find((f) => f.id === id)?.key)
          .filter((k): k is string => k !== undefined);
        const answered = keys.every((key) => answer.toLowerCase().includes(key.toLowerCase()));
        total += 1;
        if (answered) {
          hit += 1;
          details.push(`✔ ${q.id}`);
        } else {
          details.push(`✘ ${q.id}: expected key(s) ${keys.join(', ')} absent from answer`);
        }
      } else {
        total += 1;
        details.push(`✘ ${q.id}: no answer (chat round failed)`);
      }
    }
    return {
      score: total === 0 ? 0 : hit / total,
      label: `${hit}/${total}`,
      explanation: details.join('\n'),
      metadata: { hit, total },
    };
  },
};

/**
 * Deterministic hallucination count against the ground-truth corpus: sentences
 * whose specific tokens (numbers, addresses, identifiers) appear nowhere in the
 * linked investigations. Direction is minimize-by-convention (reported raw;
 * lower is better) — kept as an evaluator so it lands in the report table.
 */
export const hallucinationCount: Evaluator = {
  name: EVALUATOR_NAMES.hallucination,
  kind: 'CODE',
  direction: 'minimize',
  evaluate: async ({ output, expected }) => {
    const { c } = asCase(expected);
    const { summary } = asOutput(output);
    const corpus = groundTruthCorpus(c);
    const result = hallucinatedSentences(summary, corpus);
    return {
      score: result.count,
      label: `${result.count} suspicious / ${result.graded} sentences`,
      explanation:
        result.sentences.length > 0
          ? result.sentences.join('\n')
          : 'No ungrounded specifics found.',
      metadata: { sentences: result.sentences, graded: result.graded },
    };
  },
};
