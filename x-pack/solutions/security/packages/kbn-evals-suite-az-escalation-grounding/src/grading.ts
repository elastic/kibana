/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EscalationCase, PlantedFact } from './types';

export interface RecallResult {
  score: number;
  hit: string[];
  missed: string[];
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Token-boundary containment, case-insensitive. A token matches only when it is
 * not embedded in a longer token: `203.0.113.4` must not match inside
 * `203.0.113.44`, nor `svc_backup` inside `xsvc_backup`.
 *
 * The left boundary is `(?<![\w.])`. The right boundary is `(?![\w]|[.-]\w)`,
 * i.e. `(?![\w.])` relaxed so a sentence-ending period (`... from 198.51.100.7.`)
 * still ends the token while a dot or hyphen followed by a word character
 * (`.44`, `-2`) continues it.
 */
export const containsToken = (haystack: string, token: string): boolean => {
  if (token.length === 0) {
    return false;
  }
  return new RegExp(`(?<![\\w.])${escapeRegExp(token)}(?!\\w|[.-]\\w)`, 'i').test(haystack);
};

/**
 * Deterministic key-mention recall: a fact counts when its distinctive key is
 * mentioned (token-boundary, case-insensitive) in the text under grading.
 *
 * This measures MENTIONS, not grounding. A bare list of keys, or a sentence
 * that attaches a real key to the wrong claim, scores the same as a faithful
 * summary. `ClaimGrounding` (LLM judge) is the grounding gate; this metric only
 * proves the keys made it into the text.
 */
export const keyMentionRecall = (
  text: string | undefined,
  facts: PlantedFact[],
  options: { skipInvestigation?: number } = {}
): RecallResult => {
  const graded = facts.filter((f) => f.investigation !== options.skipInvestigation);
  const haystack = text ?? '';
  const hit = graded.filter((f) => containsToken(haystack, f.key)).map((f) => f.id);
  const missed = graded.filter((f) => !hit.includes(f.id)).map((f) => f.id);
  const score = graded.length === 0 ? 1 : hit.length / graded.length;
  return { score, hit, missed };
};

/**
 * Ground-truth corpus: every sentence an escalation summary or chat answer is
 * allowed to be built from. `skipInvestigation` removes the investigation the
 * mutation arm dropped from the product's context, so grading sees exactly the
 * corpus the product saw.
 */
export const groundTruthCorpus = (
  c: EscalationCase,
  options: { skipInvestigation?: number } = {}
): string => {
  const kept = c.investigations.filter((_, index) => index !== options.skipInvestigation);
  return kept
    .flatMap((inv) => [inv.title, ...inv.events.map((e) => Object.values(e.data).join(' '))])
    .join('\n');
};

export interface UnsupportedSpecificsResult {
  count: number;
  sentences: string[];
  graded: number;
}

/**
 * Counts sentences asserting a numeric specific (a token with a digit, at least
 * 4 characters) that appears nowhere in the ground-truth corpus at a token
 * boundary. Catches invented addresses, ids, counts and versions only: a
 * non-numeric invention ("dumped LSASS with pypykatz") carries no checkable
 * token and is NOT counted here; `ClaimGrounding` covers it.
 */
export const unsupportedNumericSpecifics = (
  text: string | undefined,
  corpus: string
): UnsupportedSpecificsResult => {
  if (!text || text.trim().length === 0) {
    return { count: 0, sentences: [], graded: 0 };
  }
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const suspicious = sentences.filter((sentence) => {
    const tokens = (sentence.match(/[A-Za-z0-9_.@:/#-]*[0-9.][A-Za-z0-9_.@:/#-]*/g) ?? []).map(
      (t) =>
        // The regex class includes sentence punctuation; trailing commas and
        // periods would break corpus containment.
        t.replace(/[.,;:]+$/, '')
    );
    // One invented numeric specific makes the sentence suspect; requiring ALL
    // to be absent would let mixed sentences (one grounded token, one invented)
    // pass.
    return tokens.some((t) => /[0-9]/.test(t) && t.length >= 4 && !containsToken(corpus, t));
  });
  return { count: suspicious.length, sentences: suspicious, graded: sentences.length };
};
