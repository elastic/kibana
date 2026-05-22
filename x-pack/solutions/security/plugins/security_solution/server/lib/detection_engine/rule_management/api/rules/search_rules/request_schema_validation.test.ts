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
  validateSearchRulesFields,
  validateSearchRulesFilter,
  validateSearchRulesRequestBody,
} from './request_schema_validation';

const gapParamsTogetherMessage =
  'Query fields "gap_fill_statuses", "gaps_range_start" and "gaps_range_end" has to be specified together';

describe('validateSearchRulesFilter', () => {
  it('accepts empty and whitespace term', () => {
    expect(validateSearchRulesFilter(undefined)).toEqual([]);
    expect(validateSearchRulesFilter({ term: '', mode: 'KQL' })).toEqual([]);
    expect(validateSearchRulesFilter({ term: '   ', mode: 'KQL' })).toEqual([]);
  });

  it('defaults to KQL mode when omitted', () => {
    expect(validateSearchRulesFilter({ term: 'alert.attributes.enabled: true' })).toEqual([]);
  });

  it('returns an error for syntactically invalid KQL', () => {
    const errors = validateSearchRulesFilter({
      term: 'alert.attributes.name: (',
      mode: 'KQL',
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('invalid KQL filter');
  });

  it('returns an error when filter exceeds max length', () => {
    const filler = 'a'.repeat(MAX_SEARCH_RULES_FILTER_KQL_LENGTH);
    const errors = validateSearchRulesFilter({ term: `${filler}x`, mode: 'KQL' });
    expect(errors).toEqual([
      `filter exceeds maximum length of ${MAX_SEARCH_RULES_FILTER_KQL_LENGTH}`,
    ]);
  });

  it('returns an error for unsupported mode', () => {
    const errors = validateSearchRulesFilter(
      JSON.parse('{"term":"alert.attributes.enabled:true","mode":"esql"}')
    );
    expect(errors).toEqual(['unsupported filter.mode "esql"']);
  });
});

describe('validateSearchRulesFields', () => {
  it('returns no errors for undefined or empty input', () => {
    expect(validateSearchRulesFields(undefined)).toEqual([]);
    expect(validateSearchRulesFields([])).toEqual([]);
  });

  it('accepts valid RuleResponse field names', () => {
    expect(validateSearchRulesFields(['name', 'severity', 'risk_score', 'tags'])).toEqual([]);
  });

  it('rejects unknown field names', () => {
    const errors = validateSearchRulesFields(['name', 'not_a_real_field']);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"not_a_real_field"');
  });

  it('rejects Alerting Framework internal names that are not in RuleResponse', () => {
    const errors = validateSearchRulesFields(['rule_type_id', 'params', 'snooze_schedule']);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"rule_type_id"');
    expect(errors[0]).toContain('"params"');
    expect(errors[0]).toContain('"snooze_schedule"');
  });

  it('reports all invalid fields in a single error message', () => {
    const errors = validateSearchRulesFields(['bad_one', 'bad_two']);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"bad_one"');
    expect(errors[0]).toContain('"bad_two"');
  });
});

describe('validateSearchRulesFields', () => {
  it('returns no errors for undefined or empty input', () => {
    expect(validateSearchRulesFields(undefined)).toEqual([]);
    expect(validateSearchRulesFields([])).toEqual([]);
  });

  it('accepts valid RuleResponse field names', () => {
    expect(validateSearchRulesFields(['name', 'severity', 'risk_score', 'tags'])).toEqual([]);
  });

  it('rejects unknown field names', () => {
    const errors = validateSearchRulesFields(['name', 'not_a_real_field']);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"not_a_real_field"');
  });

  it('rejects Alerting Framework internal names that are not in RuleResponse', () => {
    const errors = validateSearchRulesFields(['rule_type_id', 'params', 'snooze_schedule']);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"rule_type_id"');
    expect(errors[0]).toContain('"params"');
    expect(errors[0]).toContain('"snooze_schedule"');
  });

  it('reports all invalid fields in a single error message', () => {
    const errors = validateSearchRulesFields(['bad_one', 'bad_two']);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"bad_one"');
    expect(errors[0]).toContain('"bad_two"');
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
      filter: { term: 'not kql :', mode: 'KQL' },
    });
    expect(errors.some((e) => e.startsWith('invalid KQL filter'))).toBe(true);
  });

  it('rejects unsupported filter.mode', () => {
    const errors = validateSearchRulesRequestBody({
      ...defaultInput,
      filter: JSON.parse('{"term":"x","mode":"esql"}'),
    });
    expect(errors).toContain('unsupported filter.mode "esql"');
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

  it('accepts valid fields', () => {
    expect(
      validateSearchRulesRequestBody({
        ...defaultInput,
        fields: ['name', 'severity', 'enabled'],
      })
    ).toEqual([]);
  });

  it('rejects unknown fields', () => {
    const errors = validateSearchRulesRequestBody({
      ...defaultInput,
      fields: ['name', 'not_a_real_field'],
    });
    expect(errors.some((e) => e.includes('"not_a_real_field"'))).toBe(true);
  });
});
