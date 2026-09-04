/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecommendedResponseAction } from '@kbn/pnd-common';

/**
 * The label `watch_floor.yaml`'s `reason_promote_incident` step writes immediately before the
 * containment the forensics recommended, rendered with liquid's `| json` — the same
 * label-anchored contract `parse_tuning_proposal` reads, applied to the escalation gate.
 *
 * ⚠️ This is a contract with that YAML, pinned on both sides with literals: `@kbn/workflows` is
 * `group: platform` and cannot import this plugin, so there is no shared constant to couple them.
 * `index.test.ts` pins the label here. Changing one side alone does not throw — it silently drops
 * every card back to prose-only, where the recommendations are invisible.
 *
 * The trailing colon is included but no trailing space is: liquid's folded scalars can leave more
 * than one space (or a newline) between the label and the array, so the reader skips whitespace
 * instead of assuming exactly one.
 *
 * The label says "recommended", not "staged": nothing in this repo executes what it anchors, and
 * a label claiming otherwise would mislead the next person to read the YAML.
 */
export const RECOMMENDED_ACTIONS_LABEL = 'Recommended response actions JSON:';

const WHITESPACE: ReadonlySet<string> = new Set([' ', '\f', '\n', '\r', '\t', '\v']);

/**
 * Code-unit offsets of `text` from `start`.
 *
 * Deliberately **not** a spread or `Array.from(string)`: both iterate code POINTS while the scan
 * below indexes code UNITS, so a single astral character — an emoji in an action title is enough —
 * would make the scan compute an end index short of the real one and lose the array.
 */
const offsetsFrom = (text: string, start: number): number[] =>
  Array.from({ length: Math.max(text.length - start, 0) }, (_, offset) => offset);

/** The first index at or after `from` that is not whitespace, or the end of `text`. */
const skipWhitespace = (text: string, from: number): number =>
  from + (offsetsFrom(text, from).find((offset) => !WHITESPACE.has(text[from + offset])) ?? 0);

interface ArrayScanState {
  depth: number;
  /** Index just past the closing bracket, once the array has been closed. */
  end?: number;
  inString: boolean;
  isEscaped: boolean;
}

/**
 * The end of the JSON array starting at `start`, honouring quoted strings and escapes so a `]`
 * inside a title or rationale cannot close the array early. Depth-counting `[` / `]` outside
 * strings also keeps a nested array — every action carries four inside `targets` — from closing
 * the outer one.
 */
const findArrayEnd = (text: string, start: number): number | undefined =>
  offsetsFrom(text, start).reduce<ArrayScanState>(
    (state, offset) => {
      if (state.end != null) {
        return state;
      }

      const character = text[start + offset];

      if (state.inString) {
        if (state.isEscaped) {
          return { ...state, isEscaped: false };
        }
        if (character === '\\') {
          return { ...state, isEscaped: true };
        }
        return character === '"' ? { ...state, inString: false } : state;
      }

      if (character === '"') {
        return { ...state, inString: true };
      }
      if (character === '[') {
        return { ...state, depth: state.depth + 1 };
      }
      if (character === ']') {
        const depth = state.depth - 1;
        return depth === 0 ? { ...state, depth, end: start + offset + 1 } : { ...state, depth };
      }

      return state;
    },
    { depth: 0, inString: false, isEscaped: false }
  ).end;

/**
 * Minimal shape check: an object carrying string `action_type` / `execution` / `title`.
 *
 * Deliberately no more than that — the enum membership of `action_type`, `execution` and
 * `priority` is **not** enforced here. Nothing this reader returns is acted on: the card renders
 * the recommendations read-only, so an unrecognised value costs a badge that reads as written,
 * not a wrong action.
 */
const isRecommendedAction = (value: unknown): value is RecommendedResponseAction => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const { action_type: actionType, execution, title } = value as Record<string, unknown>;

  return (
    typeof actionType === 'string' && typeof execution === 'string' && typeof title === 'string'
  );
};

/**
 * The containment the Forensic Watch recommended, read from behind
 * {@link RECOMMENDED_ACTIONS_LABEL} in the `promote_incident` gate's reasoning summary.
 *
 * `undefined` on **any** failure — a missing label, a value that is not an array, an array that
 * never closes (the summary is truncated at 8192 characters silently, so a long list can lose its
 * tail), or an element without the three required strings — because the caller's fallback is the
 * prose summary, which already carries the investigation's own closing statement. An empty array
 * is **not** a failure: it means the forensics recommended nothing, which is a claim worth
 * distinguishing from a card that never carried recommendations at all.
 */
export const parseRecommendedActions = (
  reasoning: string | undefined
): RecommendedResponseAction[] | undefined => {
  if (reasoning == null) {
    return undefined;
  }

  const labelIndex = reasoning.indexOf(RECOMMENDED_ACTIONS_LABEL);
  if (labelIndex === -1) {
    return undefined;
  }

  const start = skipWhitespace(reasoning, labelIndex + RECOMMENDED_ACTIONS_LABEL.length);
  if (reasoning[start] !== '[') {
    return undefined;
  }

  const end = findArrayEnd(reasoning, start);
  if (end == null) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(reasoning.slice(start, end));

    return Array.isArray(parsed) && parsed.every(isRecommendedAction) ? parsed : undefined;
  } catch {
    // liquid rendered a partial array, or the model wrote prose where JSON was expected
    return undefined;
  }
};

/**
 * The reasoning with the machine-readable block removed: everything from
 * {@link RECOMMENDED_ACTIONS_LABEL} through the end of its JSON array (and the sentence's own
 * closing period) is dropped, leaving only the prose meant for a person. The card renders the
 * same actions as readable rows, so showing the raw array above them would be the one thing on
 * it no analyst can read.
 *
 * Returns the input untouched when the anchor or the array is not where the contract puts it —
 * on those cards the full summary is all there is. A summary whose array never closes (truncated
 * at 8192 characters) keeps the prose before the label and drops the ragged tail: half a JSON
 * blob is noise either way.
 */
export const stripRecommendedActionsJson = (reasoning: string): string => {
  const labelIndex = reasoning.indexOf(RECOMMENDED_ACTIONS_LABEL);
  if (labelIndex === -1) {
    return reasoning;
  }

  const start = skipWhitespace(reasoning, labelIndex + RECOMMENDED_ACTIONS_LABEL.length);
  if (reasoning[start] !== '[') {
    return reasoning;
  }

  const before = reasoning.slice(0, labelIndex).trimEnd();

  const end = findArrayEnd(reasoning, start);
  if (end == null) {
    return before;
  }

  const afterPeriod = skipWhitespace(reasoning, end);
  const rest = reasoning.slice(reasoning[afterPeriod] === '.' ? afterPeriod + 1 : end).trim();

  return rest.length > 0 ? (before.length > 0 ? `${before} ${rest}` : rest) : before;
};
