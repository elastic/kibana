/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateReviewRuleUpgradeRequestBody } from './request_schema_validation';
import {
  MAX_SEARCH_RULES_FILTER_KQL_LENGTH,
  MAX_SEARCH_RULES_SEARCH_TERM_LENGTH,
} from '../../../rule_management/api/rules/search_rules/request_schema_validation';

describe('validateReviewRuleUpgradeRequestBody', () => {
  const defaultInput = {
    page: 1,
    per_page: 20,
  };

  it('accepts default body with no optional fields', () => {
    expect(validateReviewRuleUpgradeRequestBody(defaultInput)).toEqual([]);
  });

  it('accepts a valid KQL filter using alerting flattened paths', () => {
    expect(
      validateReviewRuleUpgradeRequestBody({
        ...defaultInput,
        filter: { term: 'alert.attributes.tags: "tag-a"', mode: 'KQL' },
      })
    ).toEqual([]);
  });

  it('rejects a syntactically invalid KQL filter', () => {
    const errors = validateReviewRuleUpgradeRequestBody({
      ...defaultInput,
      filter: { term: 'alert.attributes.name: (' },
    });
    expect(errors.some((e) => e.startsWith('invalid KQL filter'))).toBe(true);
  });

  it('rejects a KQL filter that exceeds the maximum length', () => {
    const filler = 'a'.repeat(MAX_SEARCH_RULES_FILTER_KQL_LENGTH);
    expect(
      validateReviewRuleUpgradeRequestBody({
        ...defaultInput,
        filter: { term: `${filler}x` },
      })
    ).toEqual([`filter exceeds maximum length of ${MAX_SEARCH_RULES_FILTER_KQL_LENGTH}`]);
  });

  it('rejects unsupported filter.mode', () => {
    const errors = validateReviewRuleUpgradeRequestBody({
      ...defaultInput,
      filter: JSON.parse('{"term":"x","mode":"esql"}'),
    });
    expect(errors).toContain('unsupported filter.mode "esql"');
  });

  it('accepts sort as a non-empty array of criteria', () => {
    expect(
      validateReviewRuleUpgradeRequestBody({
        ...defaultInput,
        sort: [{ field: 'name', order: 'asc' }],
      })
    ).toEqual([]);
  });

  it('accepts fields parameter', () => {
    expect(
      validateReviewRuleUpgradeRequestBody({
        ...defaultInput,
        fields: ['name', 'tags'],
      })
    ).toEqual([]);
  });

  it('rejects duplicate entries in aggregations.counts', () => {
    expect(
      validateReviewRuleUpgradeRequestBody({
        ...defaultInput,
        aggregations: { counts: ['tags', 'tags'] },
      })
    ).toContain('aggregations.counts must not contain duplicate facet categories');
  });

  it('accepts aggregations.counts with distinct categories', () => {
    expect(
      validateReviewRuleUpgradeRequestBody({
        ...defaultInput,
        aggregations: { counts: ['tags', 'enabled'] },
      })
    ).toEqual([]);
  });

  it('rejects unsupported search.mode', () => {
    const errors = validateReviewRuleUpgradeRequestBody({
      ...defaultInput,
      search: JSON.parse('{"term":"x","mode":"vector"}'),
    });
    expect(errors).toContain('unsupported search.mode "vector"');
  });

  it('rejects search.term over max length', () => {
    expect(
      validateReviewRuleUpgradeRequestBody({
        ...defaultInput,
        search: {
          term: 'x'.repeat(MAX_SEARCH_RULES_SEARCH_TERM_LENGTH + 1),
        },
      })
    ).toContain(`search.term exceeds maximum length of ${MAX_SEARCH_RULES_SEARCH_TERM_LENGTH}`);
  });

  it('accepts search.term at max length', () => {
    expect(
      validateReviewRuleUpgradeRequestBody({
        ...defaultInput,
        search: { term: 'x'.repeat(MAX_SEARCH_RULES_SEARCH_TERM_LENGTH), mode: 'legacy' },
      })
    ).toEqual([]);
  });
});
