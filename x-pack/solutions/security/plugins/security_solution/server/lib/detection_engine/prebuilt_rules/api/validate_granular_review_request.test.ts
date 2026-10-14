/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GranularRulesFilterMode } from '../../../../../common/api/detection_engine';
import {
  MAX_SEARCH_RULES_FILTER_KQL_LENGTH,
  MAX_SEARCH_RULES_SEARCH_TERM_LENGTH,
} from '../../rule_management/api/rules/search_rules/request_schema_validation';
import { validateGranularReviewRequestBody } from './validate_granular_review_request';

describe('validateGranularReviewRequestBody', () => {
  const defaultInput = {};

  it('accepts default body with no optional fields', () => {
    expect(validateGranularReviewRequestBody(defaultInput)).toEqual([]);
  });

  it.each([
    ['security-rule.* paths', 'security-rule.tags: "tag-a"'],
    ['security-rule.attributes.* paths', 'security-rule.attributes.tags: "tag-a"'],
    ['alerting flattened paths', 'alert.attributes.tags: "tag-a"'],
  ])('accepts a valid KQL filter using %s', (_label, term) => {
    expect(
      validateGranularReviewRequestBody({
        ...defaultInput,
        filter: { term, mode: 'KQL' },
      })
    ).toEqual([]);
  });

  it('rejects a syntactically invalid KQL filter', () => {
    const errors = validateGranularReviewRequestBody({
      ...defaultInput,
      filter: { term: 'security-rule.name: (', mode: 'KQL' },
    });
    expect(errors.some((e) => e.startsWith('invalid KQL filter'))).toBe(true);
  });

  it('rejects a KQL filter that exceeds the maximum length', () => {
    const filler = 'a'.repeat(MAX_SEARCH_RULES_FILTER_KQL_LENGTH);
    expect(
      validateGranularReviewRequestBody({
        ...defaultInput,
        filter: { term: `${filler}x`, mode: 'KQL' },
      })
    ).toEqual([`filter exceeds maximum length of ${MAX_SEARCH_RULES_FILTER_KQL_LENGTH}`]);
  });

  it('rejects unsupported filter.mode', () => {
    const errors = validateGranularReviewRequestBody({
      ...defaultInput,
      filter: { term: 'x', mode: 'esql' as unknown as GranularRulesFilterMode },
    });
    expect(errors).toContain('unsupported filter.mode "esql"');
  });

  it('rejects duplicate entries in aggregations.counts', () => {
    expect(
      validateGranularReviewRequestBody({
        ...defaultInput,
        aggregations: { counts: ['tags', 'tags'] },
      })
    ).toContain('aggregations.counts must not contain duplicate facet categories');
  });

  it.each([
    ['install categories', ['tags', 'severity']],
    ['upgrade categories', ['tags', 'enabled']],
  ])('accepts aggregations.counts with distinct %s', (_label, counts) => {
    expect(
      validateGranularReviewRequestBody({
        ...defaultInput,
        aggregations: { counts },
      })
    ).toEqual([]);
  });

  it('rejects unsupported search.mode', () => {
    const errors = validateGranularReviewRequestBody({
      ...defaultInput,
      search: { term: 'x', mode: 'vector' },
    });
    expect(errors).toContain('unsupported search.mode "vector"');
  });

  it('rejects search.term over max length', () => {
    expect(
      validateGranularReviewRequestBody({
        ...defaultInput,
        search: {
          term: 'x'.repeat(MAX_SEARCH_RULES_SEARCH_TERM_LENGTH + 1),
        },
      })
    ).toContain(`search.term exceeds maximum length of ${MAX_SEARCH_RULES_SEARCH_TERM_LENGTH}`);
  });

  it('accepts search.term at max length', () => {
    expect(
      validateGranularReviewRequestBody({
        ...defaultInput,
        search: { term: 'x'.repeat(MAX_SEARCH_RULES_SEARCH_TERM_LENGTH), mode: 'legacy' },
      })
    ).toEqual([]);
  });
});
