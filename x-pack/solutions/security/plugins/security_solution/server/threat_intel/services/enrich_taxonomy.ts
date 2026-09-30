/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { z } from '@kbn/zod/v4';
import { THREAT_CATEGORIES, THREAT_REGIONS } from '../../../common/threat_intel';
import { logStageUsage } from '../lib/cost_tracker';

const TAXONOMY_BODY_CHAR_LIMIT = 30_000;

/**
 * Keeps only values from the closed set and caps the array length. A filter
 * rather than a hard reject: one hallucinated label should not throw away an
 * otherwise good enrichment, but it must not reach the index either, because
 * `categories` and `regions` are `keyword` fields that accept any string and
 * would quietly pollute the taxonomy facets.
 */
const closedSet = <T extends string>(allowed: readonly T[], max: number) =>
  z
    .array(z.string())
    .transform((values) => values.filter((v): v is T => (allowed as readonly string[]).includes(v)))
    .transform((values) => [...new Set(values)].slice(0, max));

export const taxonomyOutputSchema = z.object({
  categories: closedSet(THREAT_CATEGORIES, THREAT_CATEGORIES.length),
  regions: closedSet(THREAT_REGIONS, THREAT_REGIONS.length),
  relevance: z.number().min(0).max(1),
  diamond_suitable: z.boolean(),
});

export type TaxonomyOutput = z.infer<typeof taxonomyOutputSchema>;

export interface EnrichTaxonomyParams {
  text: string;
  report_id?: string;
  title?: string;
}

const buildTaxonomyPrompt = (params: EnrichTaxonomyParams): string => {
  const truncated = params.text.slice(0, TAXONOMY_BODY_CHAR_LIMIT);
  const reportIdLine = params.report_id ? `Report id: ${params.report_id}\n` : '';
  const titleLine = params.title ? `Report title: ${params.title}\n` : '';
  return `You are a threat intel taxonomist. Categorize the following report AND score how useful it is for writing a detection rule.

Return a strict JSON object with exactly four keys:

  categories: array of zero or more values from this closed set:
    ${JSON.stringify(THREAT_CATEGORIES)}

  regions: array of zero or more values from this closed set:
    ${JSON.stringify(THREAT_REGIONS)}

  relevance: float in [0, 1] expressing how useful this report
    is for *writing a detection rule*. Anchor points:
      0.0  - opinion piece, policy commentary, vendor PR.
      0.25 - news of a breach with no technical detail.
      0.5  - IOCs listed but no behavior described.
      0.75 - TTPs / ATT&CK techniques described.
      1.0  - concrete behavior (commands, registry keys,
             process patterns) suitable for a durable rule.

  diamond_suitable: boolean — true if this report is a specific,
    technical, attributable threat report filling ANY Diamond Model
    vertex: named threat actor or campaign attribution, specific
    malware or exploit or TTPs, C2 infrastructure or hosting
    details, or identified victims with actor context. Set false
    for marketing and thought-leadership content, trend statistics
    or predictions without actor context, vulnerability advisories
    without actor attribution, defensive guidance without actor
    context, and conference, webinar, or press announcements.

Pick only categories actively described in the text (not background
mentions). Pick "global" for regions only when the activity
genuinely targets multiple continents. Do not invent values
outside the closed sets.

${reportIdLine}${titleLine}Report text:
${truncated}`;
};

/**
 * Classify a threat report into taxonomy fields using a structured LLM call.
 * Called by the `enrich_taxonomy` kibana.request step in `enrich_threat_report`.
 *
 * Returns categories, regions, relevance, and `diamond_suitable` which gates
 * the heavy `extract_diamond` step on the same report. Token usage is logged
 * at INFO level via `logStageUsage` so per-connector cost is queryable from logs.
 */
export const enrichTaxonomy = async (
  model: ScopedModel,
  logger: Logger,
  params: EnrichTaxonomyParams
): Promise<TaxonomyOutput> => {
  const prompt = buildTaxonomyPrompt(params);
  const inferenceEndpointId = model.connector.connectorId;

  const structured = model.chatModel.withStructuredOutput(taxonomyOutputSchema, {
    includeRaw: true,
  });

  const result = (await structured.invoke(prompt)) as {
    raw: { response_metadata: Record<string, unknown> };
    parsed: TaxonomyOutput;
  };

  logStageUsage(logger, 'enrich_taxonomy', inferenceEndpointId, result.raw.response_metadata ?? {});

  logger.debug(
    `enrich_taxonomy ok diamond_suitable=${result.parsed.diamond_suitable} ` +
      `relevance=${result.parsed.relevance} report_id=${params.report_id}`
  );

  return result.parsed;
};
