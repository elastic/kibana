/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { isContextLengthExceededError } from '@kbn/inference-common';
import { z, lazySchema } from '@kbn/zod/v4';
import { type SeverityLevel, type ThreatCategory } from '../../../common/threat_intel';
import { severityScore } from './severity';
import { logStageUsage } from '../lib/cost_tracker';
import {
  furtherShrinkOverflowArticleContext,
  selectOverflowRetryArticleContext,
} from './article_context';
import { requireParsedStructuredOutput } from './structured_output';

const severityLevelSchema = lazySchema(() => z.enum(['low', 'medium', 'high', 'critical']));

/**
 * Bounds a free-text model field before it is stored. Truncates rather than
 * rejecting, so one over-long field does not throw away a good enrichment.
 */
const boundedText = (max: number) => z.string().transform((v) => v.slice(0, max));

/** A sentence or two justifying the level, not an essay. */
const SEVERITY_RATIONALE_CHAR_LIMIT = 2_000;

export const classifySeverityLlmOutputSchema = lazySchema(() =>
  z.object({
    level: severityLevelSchema,
    rationale: boundedText(SEVERITY_RATIONALE_CHAR_LIMIT).optional(),
  })
);

export type ClassifySeverityLlmOutput = z.infer<typeof classifySeverityLlmOutputSchema>;

export interface ClassifySeverityParams {
  text: string;
  report_id?: string;
  title?: string;
  /** Optional closed-set categories from `enrich_taxonomy` for extra context. */
  categories?: ThreatCategory[];
  /** Optional IOC count from `extract_iocs` for extra context. */
  ioc_count?: number;
}

export interface ClassifySeverityResult {
  level: SeverityLevel;
  score: number;
  rationale?: string;
}

export const toSeverityResult = (level: SeverityLevel): ClassifySeverityResult => ({
  level,
  score: severityScore(level),
});

const buildSeverityPrompt = (params: ClassifySeverityParams): string => {
  const reportIdLine = params.report_id ? `Report id: ${params.report_id}\n` : '';
  const titleLine = params.title ? `Report title: ${params.title}\n` : '';
  const categoriesLine =
    params.categories && params.categories.length > 0
      ? `Known categories: ${params.categories.join(', ')}\n`
      : '';
  const iocLine =
    typeof params.ioc_count === 'number' ? `Extracted IOC count: ${params.ioc_count}\n` : '';

  return `You are a threat intelligence severity classifier for Security Operations.

Classify the operational severity of this threat report for a CISO / SOC dashboard.
Return a strict JSON object with:
  level: exactly one of ["low", "medium", "high", "critical"]
  rationale: optional short phrase (why)

Anchors (pick the highest level that clearly applies):
  critical — active exploitation of critical systems, ransomware in production,
             nation-state destructive ops, zero-day under mass exploitation,
             confirmed breach with material data loss / business halt.
  high     — confirmed malware/APT campaign with concrete TTPs or IOCs,
             urgent patch for actively exploited CVE, significant targeted
             intrusion with clear victim impact.
  medium   — credible threat intel with IOCs/TTPs but limited immediacy,
             typical vendor advisories and campaign write-ups.
  low      — background research, thought leadership, marketing, policy
             commentary, historical retrospectives without urgent action.

Do not invent urgency. Prefer medium when uncertain between medium and high.
Prefer low for clearly non-actionable commentary.

${reportIdLine}${titleLine}${categoriesLine}${iocLine}Report text:
${params.text}`;
};

/**
 * Classify report severity via a structured LLM call.
 *
 * Invoked by the `classify_severity` kibana.request step in
 * `enrich_threat_report` after taxonomy enrichment so categories (and
 * optional IOC counts) can inform the prompt. Returns `level` plus the
 * shared `severityScore` map used by adapters / `create_threat_report`.
 *
 * Throws when the model returns no usable level so the HTTP route can
 * fail (5xx) and the enrich workflow can leave ingest severity alone and
 * keep `lineage.extraction_method: pending` for retry.
 */
export const classifySeverity = async (
  model: ScopedModel,
  logger: Logger,
  params: ClassifySeverityParams
): Promise<ClassifySeverityResult> => {
  const inferenceEndpointId = model.connector.connectorId;

  const structured = model.chatModel.withStructuredOutput(classifySeverityLlmOutputSchema, {
    includeRaw: true,
  });

  const invokeSeverity = async (
    promptText: string
  ): Promise<{
    raw: { response_metadata: Record<string, unknown> };
    parsed: ClassifySeverityLlmOutput | null;
  }> => {
    return (await structured.invoke(buildSeverityPrompt({ ...params, text: promptText }))) as {
      raw: { response_metadata: Record<string, unknown> };
      parsed: ClassifySeverityLlmOutput | null;
    };
  };

  let text = params.text;
  let result: {
    raw: { response_metadata: Record<string, unknown> };
    parsed: ClassifySeverityLlmOutput | null;
  };
  try {
    result = await invokeSeverity(text);
  } catch (error) {
    if (!isContextLengthExceededError(error as Error)) throw error;
    let context = selectOverflowRetryArticleContext(params.text);
    text = context.text;
    try {
      result = await invokeSeverity(text);
    } catch (retryError) {
      if (!isContextLengthExceededError(retryError as Error)) throw retryError;
      context = furtherShrinkOverflowArticleContext(context);
      text = context.text;
      result = await invokeSeverity(text);
    }
  }

  logStageUsage(
    logger,
    'classify_severity',
    inferenceEndpointId,
    result.raw.response_metadata ?? {}
  );

  const { parsed } = requireParsedStructuredOutput(result, 'classify_severity');

  const classified = toSeverityResult(parsed.level);
  logger.debug(
    `classify_severity ok level=${classified.level} score=${classified.score} ` +
      `report_id=${params.report_id}`
  );

  return {
    ...classified,
    ...(parsed.rationale ? { rationale: parsed.rationale } : {}),
  };
};
