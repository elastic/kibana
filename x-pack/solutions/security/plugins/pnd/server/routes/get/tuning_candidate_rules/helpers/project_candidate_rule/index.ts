/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PND_CANDIDATE_RULE_MAX_INDEX_PATTERNS,
  PND_CANDIDATE_RULE_MAX_QUERY_LENGTH,
  type PndCandidateRule,
} from '@kbn/pnd-common';

import type { DetectionRuleDocument } from '../../../../helpers/fetch_detection_rule';

/** A bounded string, or `undefined` when the value is absent, not a string, or too long. */
const boundedString = (value: unknown, maxLength: number): string | undefined =>
  typeof value === 'string' && value.length > 0 && value.length <= maxLength ? value : undefined;

/** A 0-100 integer risk score, or `undefined` when the value is not one. */
const riskScore = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100
    ? value
    : undefined;

/** The rule's index patterns, capped rather than dropped — see the note on `index` below. */
const indexPatterns = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const patterns = value.filter(
    (pattern): pattern is string => typeof pattern === 'string' && pattern.length <= 1024
  );

  return patterns.length === 0
    ? undefined
    : patterns.slice(0, PND_CANDIDATE_RULE_MAX_INDEX_PATTERNS);
};

/** Drop the keys whose value is `undefined`, so an absent field is absent rather than explicitly null. */
const withoutUndefined = <T extends object>(candidate: T): T =>
  Object.fromEntries(Object.entries(candidate).filter(([, value]) => value !== undefined)) as T;

/**
 * Project one detection-engine rule document into a `PndCandidateRule`, or `undefined` when it
 * carries none of the four identity fields the contract requires.
 *
 * Every optional field is projected **only** when the rules API answered with a value of the right
 * shape. That is not defensiveness for its own sake: the rules API returns a different document per
 * rule type (a `machine_learning` rule has no `query`, an `esql` rule has no `index`), and a
 * candidate that claimed a `query` it does not have would be diffed by the drafting step as if it
 * did.
 *
 * The two bounds differ on purpose, and the difference is the whole point of this function:
 *
 * - `query` above `PND_CANDIDATE_RULE_MAX_QUERY_LENGTH` is projected **absent**, never truncated.
 *   The drafting step diffs the current query against the one it proposes, so a clipped value would
 *   have it propose a change against text the rule does not hold. An absent `query` makes the step
 *   decline to propose one, which is the honest degradation.
 * - `index` above `PND_CANDIDATE_RULE_MAX_INDEX_PATTERNS` is **capped**. Index patterns are context
 *   the model reads rather than text it edits, so a shortened list costs prompt accuracy where a
 *   shortened query would corrupt the diff.
 *
 * Unknown rule fields are dropped rather than forwarded: the rules API document carries `actions`,
 * `exceptions_list` and the whole rule body, and none of it belongs in a prompt.
 */
export const projectCandidateRule = (
  rule: DetectionRuleDocument | undefined
): PndCandidateRule | undefined => {
  if (rule == null) {
    return undefined;
  }

  const id = boundedString(rule.id, 1024);
  const name = boundedString(rule.name, 1024);
  const ruleId = boundedString(rule.rule_id, 1024);
  const type = boundedString(rule.type, 64);

  // All four are `required` on the contract, so a document missing any of them cannot be projected
  // into a valid candidate — and a partial candidate is worse than none: `_apply` needs the `id`.
  if (id == null || name == null || ruleId == null || type == null) {
    return undefined;
  }

  return withoutUndefined<PndCandidateRule>({
    from: boundedString(rule.from, 64),
    id,
    index: indexPatterns(rule.index),
    interval: boundedString(rule.interval, 64),
    language: boundedString(rule.language, 64),
    name,
    query: boundedString(rule.query, PND_CANDIDATE_RULE_MAX_QUERY_LENGTH),
    risk_score: riskScore(rule.risk_score),
    rule_id: ruleId,
    severity: boundedString(rule.severity, 64),
    to: boundedString(rule.to, 64),
    type,
  });
};
