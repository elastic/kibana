/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0. Use of this file is governed by the Elastic License
 * 2.0.
 */

import type { EscalationCase, PlantedFact } from './types';

export interface RecallResult {
  score: number;
  hit: string[];
  missed: string[];
}

/**
 * Deterministic planted-fact recall: a fact is recalled when its distinctive
 * key appears (case-insensitively) in the text under grading. Keys are unique
 * per case, so a hit can only come from the fact, not from a neighbor.
 */
export const plantedFactRecall = (
  text: string | undefined,
  facts: PlantedFact[],
  options: { skipInvestigation?: number } = {}
): RecallResult => {
  const graded = facts.filter((f) => f.investigation !== options.skipInvestigation);
  const haystack = (text ?? '').toLowerCase();
  const hit = graded.filter((f) => haystack.includes(f.key.toLowerCase())).map((f) => f.id);
  const missed = graded.filter((f) => !hit.includes(f.id)).map((f) => f.id);
  const score = graded.length === 0 ? 1 : hit.length / graded.length;
  return { score, hit, missed };
};

/**
 * Ground-truth corpus: every sentence an escalation summary or chat answer is
 * allowed to be built from. Used to hallucination-count sentences that carry
 * none of the planted keys — a summary of planted facts has nowhere else to
 * take specifics from.
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

export interface HallucinationResult {
  count: number;
  sentences: string[];
  graded: number;
}

/**
 * Deterministic hallucination count over the deterministic corpus: sentences
 * that assert a specific token (a number, an address-like token, or any token
 * with a digit or dot) none of which appears in the ground-truth corpus. These
 * are sentences with the highest chance of being invented specifics.
 */
export const hallucinatedSentences = (
  text: string | undefined,
  corpus: string
): HallucinationResult => {
  if (!text || text.trim().length === 0) {
    return { count: 0, sentences: [], graded: 0 };
  }
  const corpusLower = corpus.toLowerCase();
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const suspicious = sentences.filter((sentence) => {
    const tokens =
      (sentence.match(/[A-Za-z0-9_.@:/#-]*[0-9.][A-Za-z0-9_.@:/#-]*/g) ?? []).map((t) =>
        // The regex class includes sentence punctuation; trailing commas and
        // periods would break corpus containment.
        t.replace(/[.,;]+$/, '')
      ) ?? [];
    const specifics = tokens.filter((t) => t.length >= 4 || t.includes('.'));
    if (specifics.length === 0) {
      return false;
    }
    // Suspicious when any substantive specific (contains a digit, at least 4
    // chars — enough to rule out bare ordinals like "2nd") is nowhere in the
    // corpus. Requiring ALL specifics absent would let mixed sentences
    // (one grounded token, one invented) pass.
    return specifics.some(
      (t) => /[0-9]/.test(t) && t.length >= 4 && !corpusLower.includes(t.toLowerCase())
    );
  });
  return { count: suspicious.length, sentences: suspicious, graded: sentences.length };
};
