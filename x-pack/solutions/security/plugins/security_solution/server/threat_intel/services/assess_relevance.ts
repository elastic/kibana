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
import { logStageUsage } from '../lib/cost_tracker';
import { MAX_URL_LENGTH } from '../../../common/threat_intel';
import {
  fullArticleContext,
  furtherShrinkOverflowArticleContext,
  selectOverflowRetryArticleContext,
  type ArticleContext,
} from './article_context';
import { requireParsedStructuredOutput } from './structured_output';

/**
 * Bounds a free-text model field before it is stored. Truncates rather than
 * rejecting, so one over-long field does not throw away a good enrichment.
 */
const boundedText = (max: number) => z.string().transform((v) => v.slice(0, max));

/** Roughly a paragraph. `reason` is an explanation, not a document. */
const RELEVANCE_REASON_CHAR_LIMIT = 2_000;
/** A handful of links; the model is asked for the primary sources, not a crawl. */
const MAX_PRIMARY_LINKS = 20;

export const relevanceOutputSchema = lazySchema(() =>
  z.object({
    is_intelligence: z.boolean(),
    quality_class: z.enum(['intel', 'marketing', 'rollup', 'thought_leadership']),
    evidence_tier: z.enum(['primary', 'pointer', 'mixed']),
    needs_render: z.boolean(),
    primary_links: z
      .array(z.string())
      .transform((v) => v.slice(0, MAX_PRIMARY_LINKS).map((link) => link.slice(0, MAX_URL_LENGTH))),
    has_original_commentary: z.boolean(),
    reason: boundedText(RELEVANCE_REASON_CHAR_LIMIT),
  })
);

export type RelevanceOutput = z.infer<typeof relevanceOutputSchema>;
export type RelevanceResult = RelevanceOutput & { context: Omit<ArticleContext, 'text'> };

export interface AssessRelevanceParams {
  url?: string;
  title?: string;
  text: string;
}

const buildRelevancePrompt = (params: AssessRelevanceParams, text: string): string => {
  const urlLine = params.url ? `Article URL: ${params.url}\n` : '';
  const titleLine = params.title ? `Article title: ${params.title}\n` : '';

  return `You are a threat-intel editor. Assess the following article and return a strict JSON object with exactly seven keys.

CLASSIFICATION DEFINITIONS

is_intelligence (boolean):
  true  = original threat research, incident report, malware analysis, advisory, or vulnerability
          disclosure with technical substance.
  false = vendor marketing, product announcement, career post, webinar invite, press release,
          statistical trend summary without technical detail, or any content with no threat-intel value.

quality_class (one of: "intel" | "marketing" | "rollup" | "thought_leadership"):
  "intel"            — original threat research or IR/advisory with technical substance.
  "marketing"        — product/vendor promotion, feature announcement, "Announcing X", customer
                       story, hiring, webinar, or similar commercial content.
  "rollup"           — aggregated news digest, weekly roundup, "This Week in Security", link list,
                       newsletter, or any compilation of links to other articles with minimal
                       original reporting.
  "thought_leadership" — opinion, predictions ("Predictions for 2026"), trend analysis, or strategic
                         commentary with no specific, actionable threat-intel.

evidence_tier (one of: "primary" | "pointer" | "mixed"):
  "primary" — first-party original reporting. The author investigated/discovered/disclosed this
              themselves. No upstream primary source is being cited.
  "pointer" — summarises, links to, or re-reports content whose original source is elsewhere
              (aggregator, news outlet citing a vendor report, blog post about another team's research).
  "mixed"   — contains both original reporting AND references to upstream primary sources.
  Strong pointer signals: URL path contains /weekly-roundup/, /newsletter/, /this-week-in/,
  /digest/, /roundup/; title contains "This Week in", "Roundup", "Digest", "Summary of";
  body phrases like "as reported by", "according to [vendor]", "researchers at [other org] found".

needs_render (boolean):
  true  = the content looks like a rendering failure: navigation links + title + boilerplate but
          almost no article body, or presence of "Enable JavaScript", "Checking your browser",
          "Please wait", "Cloudflare", or similar JS-gate markers. URL and title are the primary
          signal here — if the URL + title clearly describe a substantive article but the body is
          nearly empty, set true.
  false = real article content is present. Minor navigation fragments are fine.

primary_links (array of strings):
  For evidence_tier "pointer" or "mixed": the upstream source URLs or article titles THIS article is
  reporting on or linking to as its primary subject. Extract only the load-bearing sources — not
  every outbound link (ignore nav, ads, "related articles", author bios).
  For evidence_tier "primary": return [].

has_original_commentary (boolean):
  true  = the article contains meaningful original analysis, context, or commentary beyond quoting
          or paraphrasing the primary source (even if evidence_tier is "pointer" or "mixed").
  false = the article is a bare aggregation or link list with no editorial value added.

reason (string):
  One sentence (max 120 characters) explaining the classification. Be specific — name the signal
  that drove the decision (e.g. "Vendor blog announcing product feature, no IOCs or TTPs",
  "Weekly newsletter linking CrowdStrike, Mandiant reports", "Needs render: navigation only, JS gate").

${urlLine}${titleLine}Article text:
${text}`;
};

/**
 * Classify a threat-intel article for relevance and evidence tier using a structured LLM call.
 *
 * Intended for the relevance/evidence gate: given URL + title + body text, returns
 * whether the article is real threat intelligence, its quality class, its evidence tier, and
 * whether the fetch appears to have failed (needs_render). Token usage is logged at INFO level.
 */
export const assessRelevance = async (
  model: ScopedModel,
  logger: Logger,
  params: AssessRelevanceParams
): Promise<RelevanceResult> => {
  const inferenceEndpointId = model.connector.connectorId;

  const structured = model.chatModel.withStructuredOutput(relevanceOutputSchema, {
    includeRaw: true,
  });

  const invokeRelevance = async (
    text: string
  ): Promise<{ raw: { response_metadata: Record<string, unknown> }; parsed: RelevanceOutput }> => {
    const invoked = (await structured.invoke(buildRelevancePrompt(params, text))) as {
      raw: { response_metadata: Record<string, unknown> };
      parsed: RelevanceOutput | null;
    };
    return requireParsedStructuredOutput(invoked, 'assess_relevance');
  };

  let context = fullArticleContext(params.text);
  let result: {
    raw: { response_metadata: Record<string, unknown> };
    parsed: RelevanceOutput;
  };
  const startedAt = Date.now();
  try {
    result = await invokeRelevance(context.text);
  } catch (error) {
    if (!isContextLengthExceededError(error as Error)) throw error;
    context = selectOverflowRetryArticleContext(params.text);
    try {
      result = await invokeRelevance(context.text);
    } catch (retryError) {
      if (!isContextLengthExceededError(retryError as Error)) throw retryError;
      context = furtherShrinkOverflowArticleContext(context);
      result = await invokeRelevance(context.text);
    }
  }

  logStageUsage(
    logger,
    'assess_relevance',
    inferenceEndpointId,
    result.raw.response_metadata ?? {},
    Date.now() - startedAt
  );

  logger.debug(
    `assess_relevance ok is_intelligence=${result.parsed.is_intelligence} ` +
      `quality_class=${result.parsed.quality_class} evidence_tier=${result.parsed.evidence_tier} ` +
      `needs_render=${result.parsed.needs_render}`
  );

  const { text: _text, ...contextMetadata } = context;
  return { ...result.parsed, context: contextMetadata };
};
