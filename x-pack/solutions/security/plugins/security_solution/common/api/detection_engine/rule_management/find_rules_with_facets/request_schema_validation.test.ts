/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindRulesWithFacetsRequestBodyInput } from './find_rules_with_facets_route.gen';
import {
  MAX_FIND_RULES_WITH_FACETS_FILTER_KQL_LENGTH,
  MAX_FIND_RULES_WITH_FACETS_SEARCH_TERM_LENGTH,
  validateFindRulesWithFacetsKqlFilter,
  validateFindRulesWithFacetsRequestBody,
} from './request_schema_validation';

describe('validateFindRulesWithFacetsKqlFilter', () => {
  it('accepts empty and whitespace filter', () => {
    expect(validateFindRulesWithFacetsKqlFilter(undefined)).toEqual([]);
    expect(validateFindRulesWithFacetsKqlFilter('')).toEqual([]);
    expect(validateFindRulesWithFacetsKqlFilter('   ')).toEqual([]);
  });

  it('accepts valid KQL with alert.attributes prefix', () => {
    expect(validateFindRulesWithFacetsKqlFilter('alert.attributes.enabled: true')).toEqual([]);
    expect(validateFindRulesWithFacetsKqlFilter('alert.attributes.name: "My rule"')).toEqual([]);
  });

  it('accepts valid KQL with supported friendly names', () => {
    expect(validateFindRulesWithFacetsKqlFilter('enabled: true')).toEqual([]);
    expect(validateFindRulesWithFacetsKqlFilter('name: "My rule"')).toEqual([]);
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

describe('validateFindRulesWithFacetsRequestBody', () => {
  const defaultInput: FindRulesWithFacetsRequestBodyInput = {
    page: 1,
    per_page: 20,
  };

  it('accepts body without search or filter', () => {
    expect(validateFindRulesWithFacetsRequestBody(defaultInput)).toEqual([]);
  });

  it('accepts search with term and legacy mode', () => {
    expect(
      validateFindRulesWithFacetsRequestBody({
        ...defaultInput,
        search: { term: 'hello', mode: 'legacy' },
      })
    ).toEqual([]);
  });

  it('accepts search with term only', () => {
    expect(
      validateFindRulesWithFacetsRequestBody({
        ...defaultInput,
        search: { term: 'abc' },
      })
    ).toEqual([]);
  });

  it('accepts search.term at max length', () => {
    const term = 'x'.repeat(MAX_FIND_RULES_WITH_FACETS_SEARCH_TERM_LENGTH);
    expect(
      validateFindRulesWithFacetsRequestBody({
        ...defaultInput,
        search: { term, mode: 'legacy' },
      })
    ).toEqual([]);
  });

  it('rejects search.term over max length', () => {
    const errors = validateFindRulesWithFacetsRequestBody({
      ...defaultInput,
      search: {
        term: 'x'.repeat(MAX_FIND_RULES_WITH_FACETS_SEARCH_TERM_LENGTH + 1),
      },
    });
    expect(errors).toContain(
      `search.term exceeds maximum length of ${MAX_FIND_RULES_WITH_FACETS_SEARCH_TERM_LENGTH}`
    );
  });

  it('rejects invalid filter KQL', () => {
    const errors = validateFindRulesWithFacetsRequestBody({
      ...defaultInput,
      filter: 'not kql :',
    });
    expect(errors.some((e) => e.startsWith('invalid KQL filter'))).toBe(true);
  });

  it('rejects search_after without sort_field and sort_order', () => {
    expect(
      validateFindRulesWithFacetsRequestBody({
        ...defaultInput,
        search_after: [100000, 'abcde'],
      })
    ).toContain('when search_after is provided, sort_field and sort_order must be set');
  });

  it('rejects unsupported search.mode', () => {
    const errors = validateFindRulesWithFacetsRequestBody({
      ...defaultInput,
      search: {
        term: 'x',
        mode: 'vector',
      } as unknown as FindRulesWithFacetsRequestBodyInput['search'],
    });
    expect(errors).toContain('unsupported search.mode "vector"');
  });

  it('rejects duplicate entries in aggregations.counts', () => {
    const errors = validateFindRulesWithFacetsRequestBody({
      ...defaultInput,
      aggregations: { counts: ['tags', 'name', 'tags'] },
    });
    expect(errors).toContain('aggregations.counts must not contain duplicate facet categories');
  });

  it('accepts aggregations.counts with distinct categories', () => {
    expect(
      validateFindRulesWithFacetsRequestBody({
        ...defaultInput,
        aggregations: { counts: ['tags', 'name'] },
      })
    ).toEqual([]);
  });
});
