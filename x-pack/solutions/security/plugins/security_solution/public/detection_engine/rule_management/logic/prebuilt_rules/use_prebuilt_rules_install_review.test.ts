/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildInstallReviewKqlFilter } from './use_prebuilt_rules_install_review';

describe('buildInstallReviewKqlFilter', () => {
  it('returns undefined when neither tags nor rule ids are provided', () => {
    expect(buildInstallReviewKqlFilter(undefined)).toBeUndefined();
    expect(buildInstallReviewKqlFilter(undefined, [])).toBeUndefined();
    expect(buildInstallReviewKqlFilter({ name: '', tags: [] })).toBeUndefined();
  });

  it('builds a tags-only filter', () => {
    expect(buildInstallReviewKqlFilter({ name: '', tags: ['OS: Windows'] })).toEqual({
      term: '(security-rule.tags:("OS: Windows"))',
      mode: 'KQL',
    });
  });

  it('builds a rule_id-only filter for a single deep-linked rule', () => {
    expect(buildInstallReviewKqlFilter(undefined, ['rule-1'])).toEqual({
      term: '(security-rule.rule_id:("rule-1"))',
      mode: 'KQL',
    });
  });

  it('ORs multiple rule ids', () => {
    expect(buildInstallReviewKqlFilter(undefined, ['rule-1', 'rule-2'])).toEqual({
      term: '(security-rule.rule_id:("rule-1" OR "rule-2"))',
      mode: 'KQL',
    });
  });

  it('drops empty rule id strings', () => {
    expect(buildInstallReviewKqlFilter(undefined, [''])).toBeUndefined();
  });

  it('ANDs a tag filter with a deep-link rule_id filter', () => {
    expect(buildInstallReviewKqlFilter({ name: '', tags: ['OS: Windows'] }, ['rule-1'])).toEqual({
      term: '(security-rule.tags:("OS: Windows")) AND (security-rule.rule_id:("rule-1"))',
      mode: 'KQL',
    });
  });
});
