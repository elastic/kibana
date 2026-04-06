/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindRulesGranularRequestQueryInput } from './find_rules_granular_route.gen';
import {
  MAX_GRANULAR_RULES_FILTER_KQL_LENGTH,
  MAX_GRANULAR_RULES_SEARCH_TERM_LENGTH,
} from './granular_rules_limits';
import {
  validateFindRulesGranularRequestQuery,
  validateGranularRulesKqlFilter,
} from './request_schema_validation';

describe('validateGranularRulesKqlFilter', () => {
  it('accepts empty and whitespace filter', () => {
    expect(validateGranularRulesKqlFilter(undefined)).toEqual([]);
    expect(validateGranularRulesKqlFilter('')).toEqual([]);
    expect(validateGranularRulesKqlFilter('   ')).toEqual([]);
  });

  it('accepts valid KQL', () => {
    expect(validateGranularRulesKqlFilter('alert.attributes.enabled: true')).toEqual([]);
  });

  it('returns an error for syntactically invalid KQL', () => {
    const errors = validateGranularRulesKqlFilter('alert.attributes.name: (');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('invalid KQL filter');
  });

  it('returns an error when filter exceeds max length', () => {
    const filler = 'a'.repeat(MAX_GRANULAR_RULES_FILTER_KQL_LENGTH);
    const errors = validateGranularRulesKqlFilter(`${filler}x`);
    expect(errors).toEqual([
      `filter exceeds maximum length of ${MAX_GRANULAR_RULES_FILTER_KQL_LENGTH}`,
    ]);
  });
});

describe('validateFindRulesGranularRequestQuery', () => {
  const emptyQuery: FindRulesGranularRequestQueryInput = {
    page: 1,
    per_page: 20,
  };

  it('accepts minimal valid query', () => {
    expect(validateFindRulesGranularRequestQuery(emptyQuery)).toEqual([]);
  });

  it('accepts search omitted', () => {
    expect(validateFindRulesGranularRequestQuery({ ...emptyQuery, search: undefined })).toEqual([]);
  });

  it('accepts empty search object', () => {
    expect(validateFindRulesGranularRequestQuery({ ...emptyQuery, search: {} })).toEqual([]);
  });

  it('accepts search with legacy mode and term', () => {
    expect(
      validateFindRulesGranularRequestQuery({
        ...emptyQuery,
        search: { term: 'hello', mode: 'legacy' },
      })
    ).toEqual([]);
  });

  it('accepts search with only term (mode defaults at runtime)', () => {
    expect(
      validateFindRulesGranularRequestQuery({
        ...emptyQuery,
        search: { term: 'abc' },
      })
    ).toEqual([]);
  });

  it('accepts search.term at max length', () => {
    const term = 'x'.repeat(MAX_GRANULAR_RULES_SEARCH_TERM_LENGTH);
    expect(
      validateFindRulesGranularRequestQuery({
        ...emptyQuery,
        search: { term, mode: 'legacy' },
      })
    ).toEqual([]);
  });

  it('rejects partial gap parameters (parity with classic _find)', () => {
    const errors = validateFindRulesGranularRequestQuery({
      ...emptyQuery,
      gaps_range_start: '2024-01-01',
    });
    expect(errors.some((e) => e.includes('gap'))).toBe(true);
  });

  it('rejects search.term over max length', () => {
    const errors = validateFindRulesGranularRequestQuery({
      ...emptyQuery,
      search: { term: 'x'.repeat(MAX_GRANULAR_RULES_SEARCH_TERM_LENGTH + 1) },
    });
    expect(errors).toContain(
      `search.term exceeds maximum length of ${MAX_GRANULAR_RULES_SEARCH_TERM_LENGTH}`
    );
  });

  it('rejects invalid filter KQL', () => {
    const errors = validateFindRulesGranularRequestQuery({
      ...emptyQuery,
      filter: 'not kql :',
    });
    expect(errors.some((e) => e.startsWith('invalid KQL filter'))).toBe(true);
  });

  it('rejects unsupported sort field token', () => {
    const errors = validateFindRulesGranularRequestQuery({
      ...emptyQuery,
      sort: ['not_a_real_field:asc'],
    });
    expect(errors.some((e) => e.includes('unsupported sort field'))).toBe(true);
  });

  it('rejects malformed sort token', () => {
    const errors = validateFindRulesGranularRequestQuery({
      ...emptyQuery,
      sort: ['nameasc'],
    });
    expect(errors.some((e) => e.includes('invalid sort token'))).toBe(true);
  });

  it('rejects unsupported search.mode', () => {
    const errors = validateFindRulesGranularRequestQuery({
      ...emptyQuery,
      search: {
        term: 'x',
        mode: 'vector',
      } as unknown as NonNullable<FindRulesGranularRequestQueryInput['search']>,
    });
    expect(errors).toContain('unsupported search.mode "vector"');
  });
});
