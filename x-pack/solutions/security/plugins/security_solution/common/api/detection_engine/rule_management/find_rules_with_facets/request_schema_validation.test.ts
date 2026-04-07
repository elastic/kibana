/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindRulesWithFacetsRequestQueryInput } from './find_rules_with_facets_route.gen';
import {
  MAX_FIND_RULES_WITH_FACETS_FILTER_KQL_LENGTH,
  MAX_FIND_RULES_WITH_FACETS_SEARCH_TERM_LENGTH,
} from './find_rules_with_facets_limits';
import {
  validateFindRulesWithFacetsRequestQuery,
  validateFindRulesWithFacetsKqlFilter,
} from './request_schema_validation';

describe('validateFindRulesWithFacetsKqlFilter', () => {
  it('accepts empty and whitespace filter', () => {
    expect(validateFindRulesWithFacetsKqlFilter(undefined)).toEqual([]);
    expect(validateFindRulesWithFacetsKqlFilter('')).toEqual([]);
    expect(validateFindRulesWithFacetsKqlFilter('   ')).toEqual([]);
  });

  it('accepts valid KQL', () => {
    expect(validateFindRulesWithFacetsKqlFilter('alert.attributes.enabled: true')).toEqual([]);
  });

  it('returns an error for syntactically invalid KQL', () => {
    const errors = validateFindRulesWithFacetsKqlFilter('alert.attributes.name: (');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('invalid KQL filter');
  });

  it('returns an error when filter exceeds max length', () => {
    const filler = 'a'.repeat(MAX_FIND_RULES_WITH_FACETS_FILTER_KQL_LENGTH);
    const errors = validateFindRulesWithFacetsKqlFilter(`${filler}x`);
    expect(errors).toEqual([
      `filter exceeds maximum length of ${MAX_FIND_RULES_WITH_FACETS_FILTER_KQL_LENGTH}`,
    ]);
  });
});

describe('validateFindRulesWithFacetsRequestQuery', () => {
  const emptyQuery: FindRulesWithFacetsRequestQueryInput = {
    page: 1,
    per_page: 20,
  };

  it('accepts minimal valid query', () => {
    expect(validateFindRulesWithFacetsRequestQuery(emptyQuery)).toEqual([]);
  });

  it('accepts searchTerm and searchMode omitted', () => {
    expect(
      validateFindRulesWithFacetsRequestQuery({
        ...emptyQuery,
        searchTerm: undefined,
        searchMode: undefined,
      })
    ).toEqual([]);
  });

  it('accepts searchTerm with legacy searchMode', () => {
    expect(
      validateFindRulesWithFacetsRequestQuery({
        ...emptyQuery,
        searchTerm: 'hello',
        searchMode: 'legacy',
      })
    ).toEqual([]);
  });

  it('accepts searchTerm only (searchMode defaults at runtime)', () => {
    expect(
      validateFindRulesWithFacetsRequestQuery({
        ...emptyQuery,
        searchTerm: 'abc',
      })
    ).toEqual([]);
  });

  it('accepts searchTerm at max length', () => {
    const searchTerm = 'x'.repeat(MAX_FIND_RULES_WITH_FACETS_SEARCH_TERM_LENGTH);
    expect(
      validateFindRulesWithFacetsRequestQuery({
        ...emptyQuery,
        searchTerm,
        searchMode: 'legacy',
      })
    ).toEqual([]);
  });

  it('rejects partial gap parameters (parity with classic _find)', () => {
    const errors = validateFindRulesWithFacetsRequestQuery({
      ...emptyQuery,
      gaps_range_start: '2024-01-01',
    });
    expect(errors.some((e) => e.includes('gap'))).toBe(true);
  });

  it('rejects searchTerm over max length', () => {
    const errors = validateFindRulesWithFacetsRequestQuery({
      ...emptyQuery,
      searchTerm: 'x'.repeat(MAX_FIND_RULES_WITH_FACETS_SEARCH_TERM_LENGTH + 1),
    });
    expect(errors).toContain(
      `searchTerm exceeds maximum length of ${MAX_FIND_RULES_WITH_FACETS_SEARCH_TERM_LENGTH}`
    );
  });

  it('rejects invalid filter KQL', () => {
    const errors = validateFindRulesWithFacetsRequestQuery({
      ...emptyQuery,
      filter: 'not kql :',
    });
    expect(errors.some((e) => e.startsWith('invalid KQL filter'))).toBe(true);
  });

  it('rejects unsupported sort field token', () => {
    const errors = validateFindRulesWithFacetsRequestQuery({
      ...emptyQuery,
      sort: ['not_a_real_field:asc'],
    });
    expect(errors.some((e) => e.includes('unsupported sort field'))).toBe(true);
  });

  it('rejects malformed sort token', () => {
    const errors = validateFindRulesWithFacetsRequestQuery({
      ...emptyQuery,
      sort: ['nameasc'],
    });
    expect(errors.some((e) => e.includes('invalid sort token'))).toBe(true);
  });

  it('rejects unsupported searchMode', () => {
    const errors = validateFindRulesWithFacetsRequestQuery({
      ...emptyQuery,
      searchTerm: 'x',
      searchMode: 'vector' as unknown as FindRulesWithFacetsRequestQueryInput['searchMode'],
    });
    expect(errors).toContain('unsupported searchMode "vector"');
  });
});
