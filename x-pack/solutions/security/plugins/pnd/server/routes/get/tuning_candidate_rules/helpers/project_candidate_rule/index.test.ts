/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GetCandidateRulesResponse,
  PND_CANDIDATE_RULE_MAX_INDEX_PATTERNS,
  PND_CANDIDATE_RULE_MAX_QUERY_LENGTH,
} from '@kbn/pnd-common';

import { projectCandidateRule } from '.';

const rule = {
  from: 'now-360s',
  id: '4aa5ddf7-6ed3-4528-a1eb-43e363f46cf8',
  index: ['logs-endpoint.alerts-*'],
  interval: '5m',
  language: 'kuery',
  name: 'Endpoint Security [Insights]',
  query: 'event.kind : "alert"',
  risk_score: 47,
  rule_id: '61e90241-c8f2-47bc-8e47-238420a34fb6',
  severity: 'high',
  to: 'now',
  type: 'query',
};

describe('projectCandidateRule', () => {
  it('projects every field of a complete rule', () => {
    expect(projectCandidateRule(rule)).toEqual(rule);
  });

  it('emits a candidate the response contract accepts', () => {
    expect(() =>
      GetCandidateRulesResponse.parse({ rules: [projectCandidateRule(rule)] })
    ).not.toThrow();
  });

  it('returns undefined for a rule the caller could not read', () => {
    expect(projectCandidateRule(undefined)).toBeUndefined();
  });

  it.each(['id', 'name', 'rule_id', 'type'])(
    'returns undefined for a document missing %s, which the contract requires',
    (field) => {
      const withoutField = Object.fromEntries(
        Object.entries(rule).filter(([key]) => key !== field)
      );

      expect(projectCandidateRule(withoutField)).toBeUndefined();
    }
  );

  it.each(['id', 'name', 'rule_id', 'type'])(
    'returns undefined when %s is present but not a string',
    (field) => {
      expect(projectCandidateRule({ ...rule, [field]: 42 })).toBeUndefined();
    }
  );

  it('returns undefined for an empty id, which `_apply` could not patch', () => {
    expect(projectCandidateRule({ ...rule, id: '' })).toBeUndefined();
  });

  it('projects the four identity fields when nothing else is present', () => {
    const { id, name, rule_id: ruleId, type } = rule;

    expect(projectCandidateRule({ id, name, rule_id: ruleId, type })).toEqual({
      id,
      name,
      rule_id: ruleId,
      type,
    });
  });

  /**
   * The honest degradation. The drafting step diffs the rule's current query against the one it
   * proposes, so a clipped query would have it propose a change against text the rule does not hold.
   */
  it('omits a query beyond the bound rather than truncating it', () => {
    const result = projectCandidateRule({
      ...rule,
      query: 'x'.repeat(PND_CANDIDATE_RULE_MAX_QUERY_LENGTH + 1),
    });

    expect(result?.query).toBeUndefined();
  });

  it('keeps a query exactly at the bound', () => {
    const query = 'x'.repeat(PND_CANDIDATE_RULE_MAX_QUERY_LENGTH);

    expect(projectCandidateRule({ ...rule, query })?.query).toBe(query);
  });

  it('still projects the candidate when its query was too long, so the rule is choosable', () => {
    const result = projectCandidateRule({
      ...rule,
      query: 'x'.repeat(PND_CANDIDATE_RULE_MAX_QUERY_LENGTH + 1),
    });

    expect(result?.id).toBe(rule.id);
  });

  // A `machine_learning` rule has no query at all, and that is not an error.
  it('projects a rule type that carries no query', () => {
    const { query: _query, ...machineLearningRule } = rule;

    expect(projectCandidateRule({ ...machineLearningRule, type: 'machine_learning' })?.type).toBe(
      'machine_learning'
    );
  });

  /**
   * Capped rather than dropped, unlike `query`: index patterns are context the model reads rather
   * than text it edits, so a shortened list costs prompt accuracy where a shortened query would
   * corrupt the diff.
   */
  it('caps the index patterns rather than dropping them', () => {
    const result = projectCandidateRule({
      ...rule,
      index: Array.from(
        { length: PND_CANDIDATE_RULE_MAX_INDEX_PATTERNS + 5 },
        (_, i) => `logs-${i}-*`
      ),
    });

    expect(result?.index).toHaveLength(PND_CANDIDATE_RULE_MAX_INDEX_PATTERNS);
  });

  it('keeps the capped index list inside the response contract', () => {
    const rules = [
      projectCandidateRule({
        ...rule,
        index: Array.from(
          { length: PND_CANDIDATE_RULE_MAX_INDEX_PATTERNS + 5 },
          (_, i) => `logs-${i}-*`
        ),
      }),
    ];

    expect(() => GetCandidateRulesResponse.parse({ rules })).not.toThrow();
  });

  it('drops an index pattern beyond the per-item length bound', () => {
    expect(projectCandidateRule({ ...rule, index: ['logs-*', 'x'.repeat(1025)] })?.index).toEqual([
      'logs-*',
    ]);
  });

  it('omits index when it is not an array', () => {
    expect(projectCandidateRule({ ...rule, index: 'logs-*' })?.index).toBeUndefined();
  });

  it('omits index when every pattern was dropped, rather than claiming an empty list', () => {
    expect(projectCandidateRule({ ...rule, index: [42] })?.index).toBeUndefined();
  });

  it('omits risk_score above the 0..100 scale the contract bounds it to', () => {
    expect(projectCandidateRule({ ...rule, risk_score: 101 })?.risk_score).toBeUndefined();
  });

  it('omits a negative risk_score', () => {
    expect(projectCandidateRule({ ...rule, risk_score: -1 })?.risk_score).toBeUndefined();
  });

  it('omits a fractional risk_score, which the contract declares an integer', () => {
    expect(projectCandidateRule({ ...rule, risk_score: 47.5 })?.risk_score).toBeUndefined();
  });

  it('keeps a risk_score of zero, which is a real score rather than a missing one', () => {
    expect(projectCandidateRule({ ...rule, risk_score: 0 })?.risk_score).toBe(0);
  });

  it('omits severity when it is not a string', () => {
    expect(projectCandidateRule({ ...rule, severity: 3 })?.severity).toBeUndefined();
  });

  // The rules API document carries `actions`, `exceptions_list` and the whole rule body; none of it
  // belongs in a prompt.
  it('drops rule fields outside the projection', () => {
    const result = projectCandidateRule({
      ...rule,
      actions: [{ id: 'connector-1' }],
      exceptions_list: [{ id: 'list-1' }],
    });

    expect(result).toEqual(rule);
  });

  it('omits an absent optional field rather than setting it to undefined', () => {
    const { severity: _severity, ...withoutSeverity } = rule;

    expect(Object.keys(projectCandidateRule(withoutSeverity) ?? {})).not.toContain('severity');
  });
});
