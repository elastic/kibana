/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRulesRequestBodyInput } from '../../../../../../../common/api/detection_engine/rule_management/search_rules/search_rules_route.gen';
import {
  MAX_SEARCH_RULES_FILTER_KQL_LENGTH,
  MAX_SEARCH_RULES_SEARCH_TERM_LENGTH,
  validateSearchRulesKqlFilter,
  validateSearchRulesRequestBody,
} from './request_schema_validation';

const gapParamsTogetherMessage =
  'Query fields "gap_fill_statuses", "gaps_range_start" and "gaps_range_end" has to be specified together';

describe('validateSearchRulesKqlFilter', () => {
  it('accepts empty and whitespace filter', () => {
    expect(validateSearchRulesKqlFilter(undefined)).toEqual([]);
    expect(validateSearchRulesKqlFilter('')).toEqual([]);
    expect(validateSearchRulesKqlFilter('   ')).toEqual([]);
  });

  it('accepts valid KQL with alert.attributes prefix', () => {
    expect(validateSearchRulesKqlFilter('alert.attributes.enabled: true')).toEqual([]);
    expect(validateSearchRulesKqlFilter('alert.attributes.name: "My rule"')).toEqual([]);
  });

  it('returns an error for syntactically invalid KQL', () => {
    const errors = validateSearchRulesKqlFilter('alert.attributes.name: (');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('invalid KQL filter');
  });

  it('returns an error when filter exceeds max length', () => {
    const filler = 'a'.repeat(MAX_SEARCH_RULES_FILTER_KQL_LENGTH);
    const errors = validateSearchRulesKqlFilter(`${filler}x`);
    expect(errors).toEqual([
      `filter exceeds maximum length of ${MAX_SEARCH_RULES_FILTER_KQL_LENGTH}`,
    ]);
  });
});

describe('validateSearchRulesRequestBody', () => {
  const defaultInput: SearchRulesRequestBodyInput = {
    page: 1,
    per_page: 20,
  };

  it('accepts body without search or filter', () => {
    expect(validateSearchRulesRequestBody(defaultInput)).toEqual([]);
  });

  it('accepts search with term and legacy mode', () => {
    expect(
      validateSearchRulesRequestBody({
        ...defaultInput,
        search: { term: 'hello', mode: 'legacy' },
      })
    ).toEqual([]);
  });

  it('accepts search with term only', () => {
    expect(
      validateSearchRulesRequestBody({
        ...defaultInput,
        search: { term: 'abc' },
      })
    ).toEqual([]);
  });

  it('accepts search.term at max length', () => {
    const term = 'x'.repeat(MAX_SEARCH_RULES_SEARCH_TERM_LENGTH);
    expect(
      validateSearchRulesRequestBody({
        ...defaultInput,
        search: { term, mode: 'legacy' },
      })
    ).toEqual([]);
  });

  it('rejects search.term over max length', () => {
    const errors = validateSearchRulesRequestBody({
      ...defaultInput,
      search: {
        term: 'x'.repeat(MAX_SEARCH_RULES_SEARCH_TERM_LENGTH + 1),
      },
    });
    expect(errors).toContain(
      `search.term exceeds maximum length of ${MAX_SEARCH_RULES_SEARCH_TERM_LENGTH}`
    );
  });

  it('rejects invalid filter KQL', () => {
    const errors = validateSearchRulesRequestBody({
      ...defaultInput,
      filter: 'not kql :',
    });
    expect(errors.some((e) => e.startsWith('invalid KQL filter'))).toBe(true);
  });

  it('rejects search_after without sort_field and sort_order', () => {
    expect(
      validateSearchRulesRequestBody({
        ...defaultInput,
        search_after: [100000, 'abcde'],
      })
    ).toContain('when search_after is provided, sort_field and sort_order must be set');
  });

  it('rejects unsupported search.mode', () => {
    const errors = validateSearchRulesRequestBody({
      ...defaultInput,
      search: {
        term: 'x',
        mode: 'vector',
      } as unknown as SearchRulesRequestBodyInput['search'],
    });
    expect(errors).toContain('unsupported search.mode "vector"');
  });

  it('rejects duplicate entries in aggregations.counts', () => {
    const errors = validateSearchRulesRequestBody({
      ...defaultInput,
      aggregations: { counts: ['tags', 'tags'] },
    });
    expect(errors).toContain('aggregations.counts must not contain duplicate facet categories');
  });

  it('accepts aggregations.counts with distinct categories', () => {
    expect(
      validateSearchRulesRequestBody({
        ...defaultInput,
        aggregations: { counts: ['tags'] },
      })
    ).toEqual([]);
  });

  it('accepts gap_fill_statuses with both gaps_range_start and gaps_range_end', () => {
    expect(
      validateSearchRulesRequestBody({
        ...defaultInput,
        gap_fill_statuses: ['unfilled'],
        gaps_range_start: '2024-01-01T00:00:00Z',
        gaps_range_end: '2024-01-02T00:00:00Z',
      })
    ).toEqual([]);
  });

  it('accepts gap params with optional gap_auto_fill_scheduler_id', () => {
    expect(
      validateSearchRulesRequestBody({
        ...defaultInput,
        gap_fill_statuses: ['unfilled', 'error'],
        gaps_range_start: '2024-01-01T00:00:00Z',
        gaps_range_end: '2024-01-02T00:00:00Z',
        gap_auto_fill_scheduler_id: 'scheduler-1',
      })
    ).toEqual([]);
  });

  it('rejects gap_fill_statuses without gaps_range_start and gaps_range_end', () => {
    const errors = validateSearchRulesRequestBody({
      ...defaultInput,
      gap_fill_statuses: ['unfilled'],
    });
    expect(errors).toContain(gapParamsTogetherMessage);
  });

  it('rejects gaps_range_start and gaps_range_end without gap_fill_statuses', () => {
    const errors = validateSearchRulesRequestBody({
      ...defaultInput,
      gaps_range_start: '2024-01-01T00:00:00Z',
      gaps_range_end: '2024-01-02T00:00:00Z',
    });
    expect(errors).toContain(gapParamsTogetherMessage);
  });

  it('rejects gap_fill_statuses with only gaps_range_start', () => {
    const errors = validateSearchRulesRequestBody({
      ...defaultInput,
      gap_fill_statuses: ['filled'],
      gaps_range_start: '2024-01-01T00:00:00Z',
    });
    expect(errors).toContain(gapParamsTogetherMessage);
  });

  it('rejects search_after when gap filtering is active', () => {
    const errors = validateSearchRulesRequestBody({
      ...defaultInput,
      sort_field: 'name',
      sort_order: 'asc',
      search_after: [12345, 'cursor'],
      gap_fill_statuses: ['unfilled'],
      gaps_range_start: '2024-01-01T00:00:00Z',
      gaps_range_end: '2024-01-02T00:00:00Z',
    });
    expect(errors).toContain(
      '"search_after" is not supported when gap filtering is active. Use "page" and "per_page" to paginate gap-filtered results.'
    );
  });

  it('accepts search_after when gap filtering is not active', () => {
    expect(
      validateSearchRulesRequestBody({
        ...defaultInput,
        sort_field: 'name',
        sort_order: 'asc',
        search_after: [12345, 'cursor'],
      })
    ).toEqual([]);
  });

  it('accepts gap filtering without search_after', () => {
    expect(
      validateSearchRulesRequestBody({
        ...defaultInput,
        gap_fill_statuses: ['unfilled'],
        gaps_range_start: '2024-01-01T00:00:00Z',
        gaps_range_end: '2024-01-02T00:00:00Z',
      })
    ).toEqual([]);
  });
});
