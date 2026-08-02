/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndCandidateRule } from '@kbn/pnd-common';

import { filterCandidateRulesByRef } from '.';

const endpointRule: PndCandidateRule = {
  id: '4aa5ddf7-6ed3-4528-a1eb-43e363f46cf8',
  name: 'Endpoint Security [Insights]',
  rule_id: '61e90241-c8f2-47bc-8e47-238420a34fb6',
  type: 'query',
};

const oktaRule: PndCandidateRule = {
  id: 'b1c2d3e4-0000-0000-0000-000000000000',
  name: 'Okta impossible travel',
  rule_id: 'okta-impossible-travel',
  type: 'query',
};

const rules = [endpointRule, oktaRule];

describe('filterCandidateRulesByRef', () => {
  it('returns the whole menu when no ruleRef is given', () => {
    expect(filterCandidateRulesByRef({ rules })).toEqual(rules);
  });

  it('returns the whole menu for an empty ruleRef', () => {
    expect(filterCandidateRulesByRef({ ruleRef: '', rules })).toEqual(rules);
  });

  it('copies the menu rather than aliasing the caller’s array', () => {
    expect(filterCandidateRulesByRef({ rules })).not.toBe(rules);
  });

  it('matches a ruleRef carrying the saved-object id', () => {
    expect(filterCandidateRulesByRef({ ruleRef: endpointRule.id, rules })).toEqual([endpointRule]);
  });

  // The surfaces that produce a gate's `ruleRef` are not consistent about which identifier they
  // have, so requiring the saved-object id would silently empty the menu for the other.
  it('matches a ruleRef carrying the human-authored rule_id', () => {
    expect(filterCandidateRulesByRef({ ruleRef: oktaRule.rule_id, rules })).toEqual([oktaRule]);
  });

  /**
   * The load-bearing case. Falling back to the unfiltered menu would let a stale ref silently widen
   * the draft's choice back to every rule while the caller believes it asked about one.
   */
  it('returns an empty menu for an unmatched ruleRef rather than the unfiltered one', () => {
    expect(filterCandidateRulesByRef({ ruleRef: 'UNKNOWN', rules })).toEqual([]);
  });

  it('returns an empty menu when there was nothing to filter', () => {
    expect(filterCandidateRulesByRef({ ruleRef: endpointRule.id, rules: [] })).toEqual([]);
  });

  it('does not match on a prefix of an id', () => {
    expect(filterCandidateRulesByRef({ ruleRef: endpointRule.id.slice(0, 8), rules })).toEqual([]);
  });

  it('does not match on the rule name', () => {
    expect(filterCandidateRulesByRef({ ruleRef: endpointRule.name, rules })).toEqual([]);
  });

  it('keeps both candidates when one rule’s rule_id is another rule’s id', () => {
    const aliased: PndCandidateRule = { ...oktaRule, rule_id: endpointRule.id };

    expect(
      filterCandidateRulesByRef({ ruleRef: endpointRule.id, rules: [endpointRule, aliased] })
    ).toEqual([endpointRule, aliased]);
  });
});
