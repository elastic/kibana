/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { z } from '@kbn/zod/v4';
import {
  SEVERITY_LEVELS,
  type SeverityLevel,
  type ThreatCategory,
} from '../../../common/threat_intel';
import { severityScore } from './severity';
import { logStageUsage } from '../lib/cost_tracker';

const SEVERITY_BODY_CHAR_LIMIT = 30_000;

const severityLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);

/**
 * Bounds a free-text model field before it is stored. Truncates rather than
 * rejecting, so one over-long field does not throw away a good enrichment.
 */
const boundedText = (max: number) => z.string().transform((v) => v.slice(0, max));

/** A sentence or two justifying the level, not an essay. */
const SEVERITY_RATIONALE_CHAR_LIMIT = 2_000;

export const classifySeverityLlmOutputSchema = z.object({
  level: severityLevelSchema,
  rationale: boundedText(SEVERITY_RATIONALE_CHAR_LIMIT).optional(),
});

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
  const truncated = params.text.slice(0, SEVERITY_BODY_CHAR_LIMIT);
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
${truncated}`;
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
  const prompt = buildSeverityPrompt(params);
  const inferenceEndpointId = model.connector.connectorId;

  const structured = model.chatModel.withStructuredOutput(classifySeverityLlmOutputSchema, {
    includeRaw: true,
  });

  const result = (await structured.invoke(prompt)) as {
    raw: { response_metadata: Record<string, unknown> };
    parsed: ClassifySeverityLlmOutput | undefined;
  };

  logStageUsage(
    logger,
    'classify_severity',
    inferenceEndpointId,
    result.raw.response_metadata ?? {}
  );

  const level = result.parsed?.level;
  if (!level || !(SEVERITY_LEVELS as readonly string[]).includes(level)) {
    throw new Error(
      `classify_severity returned invalid level=${String(level)} report_id=${params.report_id}`
    );
  }

  const classified = toSeverityResult(level);
  logger.debug(
    `classify_severity ok level=${classified.level} score=${classified.score} ` +
      `report_id=${params.report_id}`
  );

  return {
    ...classified,
    ...(result.parsed?.rationale ? { rationale: result.parsed.rationale } : {}),
  };
};
