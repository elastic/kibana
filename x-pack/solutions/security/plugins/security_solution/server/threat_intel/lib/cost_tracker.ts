/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

export interface StageCostTrace {
  stage: string;
  inference_endpoint_id: string;
  model_name: string | undefined;
  input_tokens: number;
  output_tokens: number;
  /**
   * `null` when the model is not in the pricing table. Unpriced is not free, and
   * reporting `0` for it made real spend indistinguishable from no spend.
   */
  cost_usd: number | null;
  wall_ms: number;
}

export interface CostTrace {
  stages: StageCostTrace[];
  total_input_tokens: number;
  total_output_tokens: number;
  /** Sum over priced stages only. A lower bound when `unpriced_stage_count > 0`. */
  total_cost_usd: number;
  /** How many stages ran on a model with no pricing row. */
  unpriced_stage_count: number;
  total_wall_ms: number;
}

export interface StageUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Extracts token-usage counts from a LangChain AIMessage `response_metadata`
 * object in a best-effort, provider-agnostic way.
 *
 * Different connectors/providers surface token counts under different keys:
 *  - Anthropic (via Kibana inference plugin): `{ usage: { input_tokens, output_tokens } }`
 *  - OpenAI-compat: `{ tokenUsage: { promptTokens, completionTokens, totalTokens } }`
 *
 * Returns zero counts when the connector does not emit usage data so callers
 * can unconditionally accumulate without null checks.
 */
/**
 * `??` only catches null and undefined, so a provider that reports a token count as
 * a non-numeric string produced `NaN`, which then propagated through every total
 * and made the whole trace unreadable. Anything not a finite non-negative number
 * counts as zero.
 */
const toTokenCount = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const extractUsageFromMetadata = (metadata: Record<string, unknown>): StageUsage => {
  const usage = metadata?.usage as Record<string, unknown> | undefined;
  const tokenUsage = metadata?.tokenUsage as Record<string, unknown> | undefined;

  const input = toTokenCount(usage?.input_tokens ?? tokenUsage?.promptTokens ?? 0);
  const output = toTokenCount(usage?.output_tokens ?? tokenUsage?.completionTokens ?? 0);
  const total = toTokenCount(tokenUsage?.totalTokens ?? input + output);

  return { inputTokens: input, outputTokens: output, totalTokens: total };
};

/**
 * Logs per-call token usage at INFO level tagged by stage and inference endpoint
 * so cost can be queried from Kibana logs or forwarded to a metering system.
 *
 * Format (one line per call):
 *   [ti:cost] stage=<stage> inference_endpoint=<inferenceEndpointId>
 *             input_tokens=<n> output_tokens=<n> total_tokens=<n>
 */
// ---------------------------------------------------------------------------
// Pricing table — $/M tokens, keyed by substring of connector.config.model.
// Update against https://www.anthropic.com/pricing when new models launch.
// Patterns are matched in order; first match wins (most-specific first).
// ---------------------------------------------------------------------------

interface ModelPricing {
  pattern: string;
  inputUsdPerM: number;
  outputUsdPerM: number;
}

const PRICING_TABLE: readonly ModelPricing[] = [
  // Claude 4 family — API format: claude-{family}-4.x / haiku-4 / sonnet-4 / opus-4
  { pattern: 'haiku-4', inputUsdPerM: 0.8, outputUsdPerM: 4.0 },
  { pattern: 'sonnet-4', inputUsdPerM: 3.0, outputUsdPerM: 15.0 },
  { pattern: 'opus-4', inputUsdPerM: 15.0, outputUsdPerM: 75.0 },
  // Claude 4 family — EIS hosted format: anthropic-claude-4.x-{family}
  //
  // Only patterns matching an endpoint that actually exists. A speculative row is
  // worse than no row: it prices a model nobody can provision, and if the real
  // pricing differs the number is quietly wrong. A model with no row here reports
  // `cost_usd: null` and logs once, which is visible.
  { pattern: '4.5-haiku', inputUsdPerM: 0.8, outputUsdPerM: 4.0 },
  { pattern: '4.6-sonnet', inputUsdPerM: 3.0, outputUsdPerM: 15.0 },
  { pattern: '4.5-opus', inputUsdPerM: 15.0, outputUsdPerM: 75.0 },
  { pattern: '4.6-opus', inputUsdPerM: 15.0, outputUsdPerM: 75.0 },
  // Claude 3.x family
  { pattern: '3-5-haiku', inputUsdPerM: 0.8, outputUsdPerM: 4.0 },
  { pattern: '3-haiku', inputUsdPerM: 0.25, outputUsdPerM: 1.25 },
  { pattern: '3-7-sonnet', inputUsdPerM: 3.0, outputUsdPerM: 15.0 },
  { pattern: '3-5-sonnet', inputUsdPerM: 3.0, outputUsdPerM: 15.0 },
  { pattern: '3-opus', inputUsdPerM: 15.0, outputUsdPerM: 75.0 },
];

const lookupPricing = (modelName: string | undefined): ModelPricing | undefined => {
  if (!modelName) return undefined;
  const lower = modelName.toLowerCase();
  return PRICING_TABLE.find((p) => lower.includes(p.pattern));
};

/** Returns `null` for a model with no pricing row, rather than a misleading 0. */
const computeCostUsd = (
  modelName: string | undefined,
  inputTokens: number,
  outputTokens: number
): number | null => {
  const pricing = lookupPricing(modelName);
  if (!pricing) return null;
  return (
    (inputTokens / 1_000_000) * pricing.inputUsdPerM +
    (outputTokens / 1_000_000) * pricing.outputUsdPerM
  );
};

// ---------------------------------------------------------------------------
// CostTraceBuilder — accumulated per-stage trace for a single pipeline run.
// Create one per multi-stage LLM route, pass as optional to each LLM service,
// then call build() to produce the CostTrace attached to CorrelationFindings.
// ---------------------------------------------------------------------------

export class CostTraceBuilder {
  private readonly stages: StageCostTrace[] = [];
  /** Warn once per model so a long run does not repeat the same line per call. */
  private readonly warnedModels = new Set<string>();

  constructor(private readonly logger?: Logger) {}

  addStage(opts: {
    stage: string;
    inferenceEndpointId: string;
    modelName: string | undefined;
    metadata: Record<string, unknown>;
    wallMs: number;
  }): void {
    const { inputTokens, outputTokens } = extractUsageFromMetadata(opts.metadata);
    const costUsd = computeCostUsd(opts.modelName, inputTokens, outputTokens);

    if (costUsd === null) {
      const key = opts.modelName ?? '<unknown>';
      if (!this.warnedModels.has(key)) {
        this.warnedModels.add(key);
        this.logger?.warn(
          `[ti:cost] no pricing row for model '${key}' (endpoint ` +
            `'${opts.inferenceEndpointId}'), so its spend is reported as unpriced rather ` +
            `than zero. Add a PRICING_TABLE entry to track it.`
        );
      }
    }

    this.stages.push({
      stage: opts.stage,
      inference_endpoint_id: opts.inferenceEndpointId,
      model_name: opts.modelName,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: costUsd,
      wall_ms: opts.wallMs,
    });
  }

  build(): CostTrace {
    return {
      stages: [...this.stages],
      total_input_tokens: this.stages.reduce((sum, t) => sum + t.input_tokens, 0),
      total_output_tokens: this.stages.reduce((sum, t) => sum + t.output_tokens, 0),
      // Priced stages only. `unpriced_stage_count` says whether that is the whole
      // picture or a lower bound.
      total_cost_usd: this.stages.reduce((sum, t) => sum + (t.cost_usd ?? 0), 0),
      unpriced_stage_count: this.stages.filter((t) => t.cost_usd === null).length,
      total_wall_ms: this.stages.reduce((sum, t) => sum + t.wall_ms, 0),
    };
  }
}

export const logStageUsage = (
  logger: Logger,
  stage: string,
  inferenceEndpointId: string,
  metadata: Record<string, unknown>
): void => {
  const { inputTokens, outputTokens, totalTokens } = extractUsageFromMetadata(metadata);
  logger.info(
    `[ti:cost] stage=${stage} inference_endpoint=${inferenceEndpointId} ` +
      `input_tokens=${inputTokens} output_tokens=${outputTokens} total_tokens=${totalTokens}`
  );
};
