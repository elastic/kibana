/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_SEARCH_RULES_SEARCH_TERM_LENGTH } from '../../rule_management/search_rules/request_schema_validation';
import type { ReviewRuleUpgradeRequestBodyInput } from './review_rule_upgrade_route';
import { validateReviewRuleUpgradeRequestBody } from './request_schema_validation';

describe('validateReviewRuleUpgradeRequestBody', () => {
  const defaultInput: ReviewRuleUpgradeRequestBodyInput = {
    page: 1,
    per_page: 20,
  };

  it('accepts default body with no optional fields', () => {
    expect(validateReviewRuleUpgradeRequestBody(defaultInput)).toEqual([]);
  });

  it('accepts a valid KQL filter using alert.attributes.*', () => {
    expect(
      validateReviewRuleUpgradeRequestBody({
        ...defaultInput,
        filter: 'alert.attributes.tags: "tag-a"',
      })
    ).toEqual([]);
  });

  it('rejects a syntactically invalid KQL filter', () => {
    const errors = validateReviewRuleUpgradeRequestBody({
      ...defaultInput,
      filter: 'alert.attributes.name: (',
    });
    expect(errors.some((e) => e.startsWith('invalid KQL filter'))).toBe(true);
  });

  it('rejects sort_field without sort_order', () => {
    expect(
      validateReviewRuleUpgradeRequestBody({
        ...defaultInput,
        sort_field: 'name',
      })
    ).toContain('sort_field and sort_order must be provided together');
  });

  it('rejects sort_order without sort_field', () => {
    expect(
      validateReviewRuleUpgradeRequestBody({
        ...defaultInput,
        sort_order: 'asc',
      })
    ).toContain('sort_field and sort_order must be provided together');
  });

  it('accepts sort_field and sort_order together', () => {
    expect(
      validateReviewRuleUpgradeRequestBody({
        ...defaultInput,
        sort_field: 'name',
        sort_order: 'asc',
      })
    ).toEqual([]);
  });

  it('rejects search_after without sort_field and sort_order', () => {
    expect(
      validateReviewRuleUpgradeRequestBody({
        ...defaultInput,
        search_after: ['cursor'],
      })
    ).toContain('when search_after is provided, sort_field and sort_order must be set');
  });

  it('accepts search_after when sort_field and sort_order are set', () => {
    expect(
      validateReviewRuleUpgradeRequestBody({
        ...defaultInput,
        sort_field: 'name',
        sort_order: 'asc',
        search_after: ['cursor'],
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
        aggregations: { counts: ['tags', 'type'] },
      })
    ).toEqual([]);
  });

  it('rejects unsupported search.mode', () => {
    const errors = validateReviewRuleUpgradeRequestBody({
      ...defaultInput,
      search: {
        term: 'x',
        mode: 'vector',
      } as unknown as ReviewRuleUpgradeRequestBodyInput['search'],
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
