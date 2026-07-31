/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { z } from '@kbn/zod/v4';

import type { AttackDiscovery, Confidence } from '../../../../../common/step_types/shared_schemas';
import type { DeterministicFactors } from './compute_deterministic_factors';
import { toBand } from './compute_deterministic_factors';

/**
 * Structured output contract the model must return. Score is 0.0-1.0 and is
 * DERIVED from the factors — never a free-floating number.
 */
const ModelConfidenceSchema = z.object({
  counter_evidence: z.string(),
  factors: z
    .array(z.object({ assessment: z.string(), name: z.string() }))
    .optional()
    .default([]),
  rationale: z.string(),
  score: z.number().min(0).max(1),
});

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const SYSTEM_INSTRUCTIONS = `You score CONFIDENCE for a security Attack Discovery: how sure the discovery describes a REAL attack. This is orthogonal to severity — do NOT factor in how damaging the attack would be, only how certain it is real.

Rules:
- Derive the score from the enumerated factors below; do not emit a naked number. LLMs over-report confidence, so be conservative.
- You MUST state the strongest benign/counter explanation in "counter_evidence". If a viable benign explanation exists, cap the score accordingly.
- Calibrated anchors (0.0-1.0): >=0.85 = multiple corroborating data types, a coherent multi-stage causal chain, and no viable benign explanation; ~0.5 = partial/ambiguous evidence or a plausible benign story; <=0.2 = thin, single-source, or largely explained by benign activity.`;

const buildPrompt = ({
  deterministic,
  discovery,
}: {
  deterministic: DeterministicFactors;
  discovery: AttackDiscovery;
}): string => {
  const deterministicEvidence = deterministic.factors
    .map(
      (factor) =>
        `- ${factor.name} (contribution ${factor.weight?.toFixed(2) ?? 'n/a'}): ${
          factor.assessment
        }`
    )
    .join('\n');

  return `${SYSTEM_INSTRUCTIONS}

Discovery title: ${discovery.title}

Summary:
${discovery.summary_markdown}

Details:
${discovery.details_markdown}

Pre-computed deterministic factors (evidence breadth, MITRE completeness, structural chain coherence, and counter-evidence — a negative contribution lowers confidence):
${deterministicEvidence}

Weigh these factors plus the narrative's causal coherence, then return the confidence score (0.0-1.0), a one-paragraph rationale, the strongest counter-evidence, and any additional qualitative factors you considered.`;
};

/**
 * Ask the LLM to synthesize a calibrated confidence verdict, seeded with the
 * deterministic factors. Throws on failure so the caller can fall back to the
 * deterministic aggregate (annotate-only, best-effort).
 */
export const scoreWithLlm = async ({
  connectorId,
  deterministic,
  discovery,
  inference,
  request,
  signal,
}: {
  connectorId: string;
  deterministic: DeterministicFactors;
  discovery: AttackDiscovery;
  inference: InferenceServerStart;
  request: KibanaRequest;
  signal?: AbortSignal;
}): Promise<Confidence> => {
  const chatModel = await inference.getChatModel({
    connectorId,
    request,
    chatModelOptions: { temperature: 0, maxRetries: 0 },
  });

  const result = await chatModel
    .withStructuredOutput(ModelConfidenceSchema, { name: 'confidence', method: 'json' })
    .invoke(buildPrompt({ deterministic, discovery }), { signal });

  const parsed = ModelConfidenceSchema.parse(result);
  const score = clamp01(parsed.score);

  return {
    band: toBand(score),
    factors: [
      ...deterministic.factors,
      ...parsed.factors.map((factor) => ({ assessment: factor.assessment, name: factor.name })),
      { assessment: parsed.counter_evidence, name: 'counter_evidence_llm' },
    ],
    rationale: parsed.rationale,
    score,
  };
};
