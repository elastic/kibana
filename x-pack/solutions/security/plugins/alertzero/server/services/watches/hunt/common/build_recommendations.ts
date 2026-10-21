/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { z } from '@kbn/zod/v4';
import type { HuntCoordinatorCoreResult } from '../hunt_coordinator';

/** Schema cap: `manual_remediation` on the SSE accepts up to 50, but a hunt should stay short. */
export const MAX_RECOMMENDATIONS = 8;
export const MAX_RECOMMENDATION_LINE_CHARS = 2000;

interface RecommendationLine {
  text: string;
  /** Values the model claims this line names, checked against the run's own SSE data before keeping it. */
  entities_referenced: string[];
}

const recommendationLineSchema = z.object({
  text: z.string().min(1).max(MAX_RECOMMENDATION_LINE_CHARS),
  entities_referenced: z.array(z.string().min(1).max(256)).max(20).default([]),
});

const recommendationsExtractionSchema = z.object({
  recommendations: z.array(recommendationLineSchema).max(MAX_RECOMMENDATIONS).default([]),
});

export const RECOMMENDATIONS_PROMPT = `You are a security analyst writing next-step recommendations
for another analyst who is reviewing a confirmed hunt hit. Write up to ${MAX_RECOMMENDATIONS} short,
concrete lines: what to look at, what to pivot on, what to remediate (e.g. rotate a credential,
review a role's permissions, check for lateral movement). Only reference hosts, users, services,
techniques, or indicators that are explicitly listed in the context below — never invent one. For
each line, list in "entities_referenced" every host/user/service/technique/indicator value the line
names, exactly as given in the context. A line naming nothing specific may have an empty list.`;

/** Case-folded set of every host, user, service, technique id/name, and IOC value this run's own SSE data names. */
const buildAllowedEntitySet = (result: HuntCoordinatorCoreResult): Set<string> => {
  const values = new Set<string>();
  const add = (value: string | undefined): void => {
    if (value) values.add(value.toLowerCase());
  };
  for (const host of result.tier1.affected_assets.hosts) add(host.name);
  for (const user of result.tier1.affected_assets.users) add(user.name);
  for (const service of result.tier1.affected_assets.services) add(service.name);
  for (const ioc of result.tier1.resolved_iocs) add(ioc.value);
  for (const behavior of result.tier2?.behaviors ?? []) {
    add(behavior.technique_id);
    add(behavior.technique_name);
    for (const host of behavior.affected_hosts ?? []) add(host);
    for (const user of behavior.affected_users ?? []) add(user);
  }
  return values;
};

/**
 * A separator-joined identifier (`GHOST-HOST99`, `ghost-host-99`, `10.0.0.5`) that carries a
 * digit anywhere, or is all-uppercase with none. Plain hyphenated prose (`real-time`,
 * `well-known`) has neither, so it doesn't match. Same spirit as `report_grounding.ts`'s
 * `SINGLE_TOKEN` check: a narrow whitelist that only ever chooses which direction to be
 * wrong in, not a full simulation of every way a model might phrase a name.
 */
const SEPARATOR_JOINED = /^[A-Za-z0-9]+([._-][A-Za-z0-9]+)+$/;

/**
 * The one shape worth carving out of "any digit means entity": a bare number followed by a
 * single plain-English unit word (`24-hour`, `5-minute`, `2-factor`) is a quantity, not a
 * name. This codebase's own asset-naming convention always suffixes the digits
 * (`WIN-ANALYST01`, `GHOST-HOST99`) rather than leading with them, so number-first is a safe
 * signal — and it stays narrow on purpose: a hostname with its digits in their own segment
 * anywhere else (`ghost-host-99`, `server-01`, three or more segments) still falls through to
 * the broad digit check below, rather than being swept into the same exemption. Checked only
 * once the uppercase case is already ruled out: a quantity phrase's unit word is plain
 * English prose, never all-caps, so an all-uppercase number-prefixed token (`99-GHOST`) is
 * never actually a quantity and must not be exempted just because it leads with a number.
 */
const isNumericQuantityPhrase = (segments: string[]): boolean =>
  segments.length === 2 && /^\d+$/.test(segments[0]) && /^[A-Za-z]+$/.test(segments[1]);

const looksLikeEntity = (token: string): boolean => {
  if (!SEPARATOR_JOINED.test(token)) return false;
  const segments = token.split(/[._-]/);
  const bare = segments.join('');
  if (bare === bare.toUpperCase()) return true;
  if (isNumericQuantityPhrase(segments)) return false;
  return /\d/.test(bare);
};

/**
 * Entity-shaped tokens in free text, stripped of surrounding sentence punctuation and the
 * Markdown a model can wrap a name in (`` `GHOST-HOST99` ``, `**GHOST-HOST99**`) — code spans
 * and emphasis markers would otherwise shield a hallucinated name from `looksLikeEntity`
 * exactly the way an unlisted `entities_referenced` entry does.
 */
const extractEntityLikeTokens = (text: string): string[] =>
  text
    .split(/\s+/)
    .map((token) => token.replace(/^[(["'`*_]+|[)\].,;:!?"'`*_]+$/g, ''))
    .filter(looksLikeEntity);

/**
 * `entities_referenced` is the model's own self-report of what a line names, and an empty
 * list satisfies `.every` on it unconditionally — so a hallucinated host the model simply
 * forgot (or declined) to list passes for free. The line's own text is checked independently
 * of that self-report so a line cannot clear grounding just by omitting a name from its own
 * list; `entities_referenced` still has to agree with `allowed` too, so a line also can't pass
 * by self-reporting an entity that isn't actually in the allowed set.
 */
const isLineGrounded = (line: RecommendationLine, allowed: Set<string>): boolean =>
  line.entities_referenced.every((value) => allowed.has(value.toLowerCase())) &&
  extractEntityLikeTokens(line.text).every((token) => allowed.has(token.toLowerCase()));

/** One line per confirmed technique, then a fallback so a confirmed hit never yields nothing. */
export const templateRecommendations = (result: HuntCoordinatorCoreResult): string[] => {
  const hostsAndServices = [
    ...result.tier1.affected_assets.hosts.map((h) => h.name),
    ...result.tier1.affected_assets.users.map((u) => u.name),
    ...result.tier1.affected_assets.services.map((s) => s.name),
  ];
  const confirmed = (result.tier2?.behaviors ?? []).filter((b) => b.execution?.hit === true);
  const lines: string[] = [];
  for (const behavior of confirmed.slice(0, MAX_RECOMMENDATIONS)) {
    const who = [...(behavior.affected_hosts ?? []), ...(behavior.affected_users ?? [])];
    const target = (who.length > 0 ? who : hostsAndServices).slice(0, 3).join(', ');
    lines.push(
      `Review ${behavior.technique_name} (${behavior.technique_id})${
        target ? ` involving ${target}` : ''
      }; use the validated ES|QL on this finding to pivot further.`
    );
  }
  if (lines.length === 0 && hostsAndServices.length > 0) {
    lines.push(
      `Review the confirmed indicator match involving ${hostsAndServices
        .slice(0, 5)
        .join(', ')}; no behavioral query executed for this run, so start from Tier 1's matches.`
    );
  }
  if (lines.length === 0) {
    lines.push(
      'Review the confirmed hit directly; no specific host, user, or behavior detail was available to target the next step.'
    );
  }
  return lines.slice(0, MAX_RECOMMENDATIONS);
};

/**
 * Up to `MAX_RECOMMENDATIONS` analyst next-step lines for a confirmed hit. Tries one structured
 * model call, grounded to this run's own SSE-visible entities so a line cannot name a host, user,
 * technique, or indicator the hunt never actually saw. Falls back to a deterministic template on
 * no model, a failed call, or every line being dropped by the grounding filter — never an empty
 * list on a confirmed hit.
 */
export const generateRecommendations = async ({
  model,
  logger,
  result,
  context,
}: {
  model: ScopedModel | undefined;
  logger: Logger;
  result: HuntCoordinatorCoreResult;
  /** Report-derived text (narrative excerpt, behavior evidence) the model reads alongside the prompt. */
  context: string;
}): Promise<string[]> => {
  if (!model) {
    return templateRecommendations(result);
  }
  try {
    const structured = model.chatModel.withStructuredOutput(recommendationsExtractionSchema);
    const parsed = (await structured.invoke(
      `${RECOMMENDATIONS_PROMPT}\n\n--- CONTEXT ---\n${context}`
    )) as z.infer<typeof recommendationsExtractionSchema>;
    const allowed = buildAllowedEntitySet(result);
    const grounded = parsed.recommendations
      .filter((line) => isLineGrounded(line, allowed))
      .map((line) => line.text);
    if (grounded.length > 0) {
      return grounded.slice(0, MAX_RECOMMENDATIONS);
    }
    logger.debug(
      '[hunt:recommendations] every generated line was dropped by grounding; using the template floor.'
    );
  } catch (err) {
    logger.warn(
      `[hunt:recommendations] generation failed, using the template floor — ${
        (err as Error).message
      }`
    );
  }
  return templateRecommendations(result);
};
