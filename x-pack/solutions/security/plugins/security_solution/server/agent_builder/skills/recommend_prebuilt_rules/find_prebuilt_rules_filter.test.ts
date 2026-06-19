/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPrebuiltRulesToolFilter } from './find_prebuilt_rules_filter';

describe('buildPrebuiltRulesToolFilter', () => {
  it('returns undefined when no parameters are provided', () => {
    expect(buildPrebuiltRulesToolFilter({})).toBeUndefined();
  });

  it('builds a single-token keywords clause over name and description', () => {
    expect(buildPrebuiltRulesToolFilter({ keywords: 'mimikatz' })).toBe(
      '(security-rule.name: mimikatz OR security-rule.description: mimikatz)'
    );
  });

  it('ANDs multi-token keywords within each field', () => {
    expect(buildPrebuiltRulesToolFilter({ keywords: 'lsass memory' })).toBe(
      '(security-rule.name: (lsass AND memory) OR security-rule.description: (lsass AND memory))'
    );
  });

  it('builds severity clause (single)', () => {
    expect(buildPrebuiltRulesToolFilter({ severity: ['critical'] })).toBe(
      'security-rule.severity: (critical)'
    );
  });

  it('builds severity clause with OR for multiple values', () => {
    expect(buildPrebuiltRulesToolFilter({ severity: ['critical', 'high'] })).toBe(
      'security-rule.severity: (critical OR high)'
    );
  });

  it('builds ruleType clause with OR for multiple values', () => {
    expect(buildPrebuiltRulesToolFilter({ ruleType: ['esql', 'eql'] })).toBe(
      'security-rule.type: (esql OR eql)'
    );
  });

  it('builds tags clause (single)', () => {
    expect(buildPrebuiltRulesToolFilter({ tags: ['OS: Windows'] })).toBe(
      'security-rule.tags: ("OS: Windows")'
    );
  });

  it('builds tags clause with OR for multiple values', () => {
    expect(buildPrebuiltRulesToolFilter({ tags: ['OS: Windows', 'Domain: LLM'] })).toBe(
      'security-rule.tags: ("OS: Windows" OR "Domain: LLM")'
    );
  });

  it('routes a single mitreTechnique to the technique id field', () => {
    expect(buildPrebuiltRulesToolFilter({ mitreTechnique: ['T1059'] })).toBe(
      'security-rule.threat.technique.id: (T1059)'
    );
  });

  it('routes a single sub-technique to the subtechnique id field', () => {
    expect(buildPrebuiltRulesToolFilter({ mitreTechnique: ['T1059.001'] })).toBe(
      'security-rule.threat.technique.subtechnique.id: (T1059.001)'
    );
  });

  it('ORs techniques and sub-techniques across their respective fields', () => {
    expect(buildPrebuiltRulesToolFilter({ mitreTechnique: ['T1059', 'T1071', 'T1059.001'] })).toBe(
      '(security-rule.threat.technique.id: (T1059 OR T1071) OR security-rule.threat.technique.subtechnique.id: (T1059.001))'
    );
  });

  it('routes a single tactic ID to threat.tactic.id', () => {
    expect(buildPrebuiltRulesToolFilter({ mitreTactic: ['TA0001'] })).toBe(
      'security-rule.threat.tactic.id: (TA0001)'
    );
  });

  it('routes a single tactic display name to threat.tactic.name', () => {
    expect(buildPrebuiltRulesToolFilter({ mitreTactic: ['Initial Access'] })).toBe(
      'security-rule.threat.tactic.name: ("Initial Access")'
    );
  });

  it('ORs multiple tactic IDs in one clause', () => {
    expect(buildPrebuiltRulesToolFilter({ mitreTactic: ['TA0001', 'TA0006'] })).toBe(
      'security-rule.threat.tactic.id: (TA0001 OR TA0006)'
    );
  });

  it('ORs tactic IDs and names across their respective fields', () => {
    expect(buildPrebuiltRulesToolFilter({ mitreTactic: ['TA0001', 'Credential Access'] })).toBe(
      '(security-rule.threat.tactic.id: (TA0001) OR security-rule.threat.tactic.name: ("Credential Access"))'
    );
  });

  it('builds relatedIntegrations clause with quoted packages', () => {
    expect(buildPrebuiltRulesToolFilter({ relatedIntegrations: ['okta', 'aws'] })).toBe(
      'security-rule.related_integrations.package: ("okta" OR "aws")'
    );
  });

  it('builds ruleIds clause with quoted ids', () => {
    expect(buildPrebuiltRulesToolFilter({ ruleIds: ['abc-123', 'def-456'] })).toBe(
      'security-rule.rule_id: ("abc-123" OR "def-456")'
    );
  });

  it('ANDs multiple parameters together', () => {
    const result = buildPrebuiltRulesToolFilter({ severity: ['critical'], ruleType: ['esql'] });
    expect(result).toBe('security-rule.severity: (critical) AND security-rule.type: (esql)');
  });

  it('treats an empty array the same as an omitted parameter (no clause)', () => {
    expect(buildPrebuiltRulesToolFilter({ tags: [], severity: [] })).toBeUndefined();
  });
});
