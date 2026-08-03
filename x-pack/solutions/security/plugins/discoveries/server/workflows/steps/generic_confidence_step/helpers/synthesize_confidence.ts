/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { z } from '@kbn/zod/v4';

import { toBand } from '@kbn/discoveries/impl/confidence';
import type { DeterministicFactors } from '@kbn/discoveries/impl/confidence';
import type { Confidence } from '../../../../../common/step_types/shared_schemas';

/**
 * Optional narrative context for the bundle being scored. For an attack
 * discovery this is its title/summary/details; for a bare set of detection
 * alerts it may be absent, in which case the model reasons from the
 * deterministic factors alone.
 */
export interface ConfidenceSubject {
  details_markdown?: string;
  summary_markdown?: string;
  title?: string;
}

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

const SYSTEM_INSTRUCTIONS = `You score CONFIDENCE for a security finding — either an attack discovery or a bundle of related detection alerts: how sure you are it describes a REAL attack. This is orthogonal to severity — do NOT factor in how damaging the attack would be, only how certain it is real.

Rules:
- Derive the score from the enumerated factors below; do not emit a naked number. LLMs over-report confidence, so be conservative.
- You MUST state the strongest benign/counter explanation in "counter_evidence". If a viable benign explanation exists, cap the score accordingly.
- Calibrated anchors (0.0-1.0): >=0.85 = multiple corroborating data types, a coherent multi-stage causal chain, and no viable benign explanation; ~0.5 = partial/ambiguous evidence or a plausible benign story; <=0.2 = thin, single-source, or largely explained by benign activity.`;

const buildPrompt = ({
  deterministic,
  subject,
}: {
  deterministic: DeterministicFactors;
  subject?: ConfidenceSubject;
}): string => {
  const deterministicEvidence = deterministic.factors
    .map(
      (factor) =>
        `- ${factor.name} (contribution ${factor.weight?.toFixed(2) ?? 'n/a'}): ${
          factor.assessment
        }`
    )
    .join('\n');

  const narrative = [
    subject?.title ? `Finding title: ${subject.title}` : undefined,
    subject?.summary_markdown ? `Summary:\n${subject.summary_markdown}` : undefined,
    subject?.details_markdown ? `Details:\n${subject.details_markdown}` : undefined,
  ]
    .filter((section): section is string => section != null)
    .join('\n\n');

  return `${SYSTEM_INSTRUCTIONS}
${
  narrative
    ? `\n${narrative}\n`
    : `\nNo narrative was provided; reason from the alert evidence alone.\n`
}
Pre-computed deterministic factors (evidence breadth, MITRE completeness, structural chain coherence, and counter-evidence — a negative contribution lowers confidence):
${deterministicEvidence}

Weigh these factors plus any causal coherence in the evidence, then return the confidence score (0.0-1.0), a one-paragraph rationale, the strongest counter-evidence, and any additional qualitative factors you considered.`;
};

/**
 * Ask the LLM to synthesize a calibrated confidence verdict for an alert bundle,
 * seeded with the deterministic factors. Throws on failure so the caller can
 * fall back to the deterministic aggregate (best-effort).
 */
export const synthesizeConfidence = async ({
  connectorId,
  deterministic,
  inference,
  request,
  signal,
  subject,
}: {
  connectorId: string;
  deterministic: DeterministicFactors;
  inference: InferenceServerStart;
  request: KibanaRequest;
  signal?: AbortSignal;
  subject?: ConfidenceSubject;
}): Promise<Confidence> => {
  const chatModel = await inference.getChatModel({
    connectorId,
    request,
    chatModelOptions: { temperature: 0, maxRetries: 0 },
  });

  const result = await chatModel
    .withStructuredOutput(ModelConfidenceSchema, { name: 'confidence', method: 'json' })
    .invoke(buildPrompt({ deterministic, subject }), { signal });

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
