/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateReviewRuleInstallationRequestBody } from './request_schema_validation';
import {
  MAX_SEARCH_RULES_FILTER_KQL_LENGTH,
  MAX_SEARCH_RULES_SEARCH_TERM_LENGTH,
} from '../../../rule_management/api/rules/search_rules/request_schema_validation';
import type { PrebuiltRuleAssetsFacetCategory } from '../../../../../../common/api/detection_engine';

describe('validateReviewRuleInstallationRequestBody', () => {
  const defaultInput = {
    page: 1,
    per_page: 20,
  };

  it('accepts default body with no optional fields', () => {
    expect(validateReviewRuleInstallationRequestBody(defaultInput)).toEqual([]);
  });

  it('accepts a valid KQL filter using flattened security-rule.* paths', () => {
    expect(
      validateReviewRuleInstallationRequestBody({
        ...defaultInput,
        filter: 'security-rule.tags: "tag-a"',
      })
    ).toEqual([]);
  });

  it('accepts legacy security-rule.attributes.* filter strings (syntax only)', () => {
    expect(
      validateReviewRuleInstallationRequestBody({
        ...defaultInput,
        filter: 'security-rule.attributes.tags: "tag-a"',
      })
    ).toEqual([]);
  });

  it('rejects a syntactically invalid KQL filter', () => {
    const errors = validateReviewRuleInstallationRequestBody({
      ...defaultInput,
      filter: 'security-rule.name: (',
    });
    expect(errors.some((e) => e.startsWith('invalid KQL filter'))).toBe(true);
  });

  it('rejects a KQL filter that exceeds the maximum length', () => {
    const filler = 'a'.repeat(MAX_SEARCH_RULES_FILTER_KQL_LENGTH);
    expect(
      validateReviewRuleInstallationRequestBody({
        ...defaultInput,
        filter: `${filler}x`,
      })
    ).toEqual([`filter exceeds maximum length of ${MAX_SEARCH_RULES_FILTER_KQL_LENGTH}`]);
  });

  it('accepts sort as a non-empty array of criteria', () => {
    expect(
      validateReviewRuleInstallationRequestBody({
        ...defaultInput,
        sort: [{ field: 'name', order: 'asc' }],
      })
    ).toEqual([]);
  });

  it('accepts fields parameter', () => {
    expect(
      validateReviewRuleInstallationRequestBody({
        ...defaultInput,
        fields: ['name', 'tags'],
      })
    ).toEqual([]);
  });

  it('rejects duplicate entries in aggregations.counts', () => {
    expect(
      validateReviewRuleInstallationRequestBody({
        ...defaultInput,
        aggregations: { counts: ['tags', 'tags'] },
      })
    ).toContain('aggregations.counts must not contain duplicate facet categories');
  });

  it('accepts aggregations.counts with distinct categories', () => {
    expect(
      validateReviewRuleInstallationRequestBody({
        ...defaultInput,
        aggregations: { counts: ['tags', 'severity'] as PrebuiltRuleAssetsFacetCategory[] },
      })
    ).toEqual([]);
  });

  it('rejects unsupported search.mode', () => {
    const errors = validateReviewRuleInstallationRequestBody({
      ...defaultInput,
      search: JSON.parse('{"term":"x","mode":"vector"}'),
    });
    expect(errors).toContain('unsupported search.mode "vector"');
  });

  it('rejects search.term over max length', () => {
    expect(
      validateReviewRuleInstallationRequestBody({
        ...defaultInput,
        search: {
          term: 'x'.repeat(MAX_SEARCH_RULES_SEARCH_TERM_LENGTH + 1),
        },
      })
    ).toContain(`search.term exceeds maximum length of ${MAX_SEARCH_RULES_SEARCH_TERM_LENGTH}`);
  });

  it('accepts search.term at max length', () => {
    expect(
      validateReviewRuleInstallationRequestBody({
        ...defaultInput,
        search: { term: 'x'.repeat(MAX_SEARCH_RULES_SEARCH_TERM_LENGTH), mode: 'legacy' },
      })
    ).toEqual([]);
  });
});
