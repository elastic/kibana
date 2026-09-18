/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Helpers for counting narrative claims in an Agent Builder converse response
 * without counting substring hits inside tool outputs (ES|QL result payloads
 * can contain hundreds of incidental matches).
 */

interface ResponseStepLike {
  type?: string;
  output?: unknown;
  message?: unknown;
}

interface ResponseLike {
  steps?: ResponseStepLike[];
  output?: unknown;
  message?: unknown;
}

function textFromUnknown(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const content = (value as { content?: unknown }).content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .map((part) =>
          part && typeof part === 'object' ? String((part as { text?: unknown }).text ?? '') : ''
        )
        .join('\n');
    }
  }
  return '';
}

/**
 * Extracts only the model's own message text from a converse response:
 * assistant narrative steps and the final output — never tool outputs.
 */
export function getNarrativeText(response: ResponseLike): string {
  const parts: string[] = [];
  for (const step of response.steps ?? []) {
    // Assistant-authored steps only; tool result steps carry raw payloads.
    if (step.type === 'llm' || step.type === 'agent_message' || step.type === 'output_text') {
      parts.push(textFromUnknown(step.output) + textFromUnknown(step.message));
    }
  }
  parts.push(textFromUnknown(response.output) + textFromUnknown(response.message));
  return parts.join('\n');
}

/**
 * Splits narrative text into claim units: a bullet/line, or a sentence within
 * a line. A unit is the smallest span that can carry one claim — sentence
 * granularity, not clause: a semicolon-joined sentence is still one claim.
 */
export const splitClaimUnits = (text: string): string[] =>
  text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((unit) => unit.trim())
    .filter((unit) => unit.length > 0);

/**
 * Counts distinct CLAIMS (claim units) that match `pattern`, not distinct word
 * forms.
 *
 * A claim is a unit, so the same event described twice in one sentence is one
 * claim and three stage bullets are three claims even when each uses the same
 * verb. The previous metric — `new Set(matches.map(lowercase)).size` over
 * `String.match` — counted lexical forms instead, which inverted the signal in
 * both directions:
 *
 *   - "Corroborated: stage A / stage B / stage C" (three separate corroborated
 *     events, same verb form) scored 1, so a correct report failed the depth
 *     bound.
 *   - One hedged sentence using "corroborated", "corroborating" and
 *     "corroboration" scored 3, so a report that corroborated nothing passed it.
 *
 * Both directions are pinned in `narrative_claims.test.ts`.
 */
export const countClaimUnits = (text: string, pattern: RegExp): number => {
  // Rebuild without the global flag: a shared /g regex carries `lastIndex`
  // between `.test()` calls and would skip alternating units.
  const matcher = new RegExp(pattern.source, pattern.flags.replace(/g/g, ''));
  return splitClaimUnits(text).filter((unit) => matcher.test(unit)).length;
};
