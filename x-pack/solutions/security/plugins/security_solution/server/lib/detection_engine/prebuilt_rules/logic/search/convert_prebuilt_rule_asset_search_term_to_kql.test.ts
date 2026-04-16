/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertPrebuiltRuleAssetSearchTermToKql } from './convert_prebuilt_rule_asset_search_term_to_kql';

describe('convertPrebuiltRuleAssetSearchTermToKql', () => {
  it('produces a wildcarded keyword match for single-term values', () => {
    const kql = convertPrebuiltRuleAssetSearchTermToKql('phishing');
    expect(kql).toContain('security-rule.attributes.name.keyword: *phishing*');
    expect(kql).toContain('security-rule.attributes.tags: "phishing"');
    expect(kql).toContain('security-rule.attributes.type: "phishing"');
  });

  it('falls back to an analyzed-name phrase match for multi-term values', () => {
    const kql = convertPrebuiltRuleAssetSearchTermToKql('credential access');
    expect(kql).toContain('security-rule.attributes.name: "credential access"');
    expect(kql).not.toContain('keyword:');
  });

  it('escapes KQL-special characters in single-term wildcard values', () => {
    const kql = convertPrebuiltRuleAssetSearchTermToKql('svc:name');
    expect(kql).toContain('security-rule.attributes.name.keyword: *svc\\:name*');
  });

  it('joins all clauses with OR', () => {
    const kql = convertPrebuiltRuleAssetSearchTermToKql('alert');
    expect(kql.split(' OR ')).toHaveLength(3);
  });
});
