/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { gapFillStatus } from '@kbn/alerting-plugin/common';
import type { FindRulesRequestQueryInput } from './find_rules_route.gen';
import { validateFindRulesRequestQuery } from './request_schema_validation';

const GAP_FILTERS_COUPLING_ERROR =
  'Query fields "gap_fill_statuses", "gaps_range_start" and "gaps_range_end" has to be specified together';

describe('Find rules request schema, additional validation', () => {
  describe('validateFindRulesRequestQuery', () => {
    describe('gap filters coupling', () => {
      test('Valid when gap_fill_statuses with both gaps_range_start and gaps_range_end', () => {
        const schema: FindRulesRequestQueryInput = {
          gap_fill_statuses: [gapFillStatus.UNFILLED],
          gaps_range_start: '2024-01-01T00:00:00.000Z',
          gaps_range_end: '2024-01-02T00:00:00.000Z',
        };
        const errors = validateFindRulesRequestQuery(schema);
        expect(errors).toEqual([]);
      });

      test('Error when gap_fill_statuses present without gaps_range_start and gaps_range_end', () => {
        const schema: FindRulesRequestQueryInput = {
          gap_fill_statuses: [gapFillStatus.IN_PROGRESS],
        };
        const errors = validateFindRulesRequestQuery(schema);
        expect(errors).toEqual([GAP_FILTERS_COUPLING_ERROR]);
      });

      test('Error when gap_fill_statuses present with only gaps_range_start', () => {
        const schema: FindRulesRequestQueryInput = {
          gap_fill_statuses: [gapFillStatus.FILLED],
          gaps_range_start: '2024-01-01T00:00:00.000Z',
        };
        const errors = validateFindRulesRequestQuery(schema);
        expect(errors).toEqual([GAP_FILTERS_COUPLING_ERROR]);
      });

      test('Error when gap_fill_statuses present with only gaps_range_end', () => {
        const schema: FindRulesRequestQueryInput = {
          gap_fill_statuses: [gapFillStatus.FILLED],
          gaps_range_end: '2024-01-02T00:00:00.000Z',
        };
        const errors = validateFindRulesRequestQuery(schema);
        expect(errors).toEqual([GAP_FILTERS_COUPLING_ERROR]);
      });

      test('Error when gaps_range_start and gaps_range_end present without gap_fill_statuses', () => {
        const schema: FindRulesRequestQueryInput = {
          gaps_range_start: '2024-01-01T00:00:00.000Z',
          gaps_range_end: '2024-01-02T00:00:00.000Z',
        };
        const errors = validateFindRulesRequestQuery(schema);
        expect(errors).toEqual([GAP_FILTERS_COUPLING_ERROR]);
      });

      test('Error when only gaps_range_start present without gap_fill_statuses', () => {
        const schema: FindRulesRequestQueryInput = {
          gaps_range_start: '2024-01-01T00:00:00.000Z',
        };
        const errors = validateFindRulesRequestQuery(schema);
        expect(errors).toEqual([GAP_FILTERS_COUPLING_ERROR]);
      });

      test('Error when only gaps_range_end present without gap_fill_statuses', () => {
        const schema: FindRulesRequestQueryInput = {
          gaps_range_end: '2024-01-02T00:00:00.000Z',
        };
        const errors = validateFindRulesRequestQuery(schema);
        expect(errors).toEqual([GAP_FILTERS_COUPLING_ERROR]);
      });

      test('No error when none of gap filters are provided', () => {
        const schema: FindRulesRequestQueryInput = {};
        const errors = validateFindRulesRequestQuery(schema);
        expect(errors).toEqual([]);
      });
    });

    test('You can have an empty sort_field and empty sort_order', () => {
      const schema: FindRulesRequestQueryInput = {};
      const errors = validateFindRulesRequestQuery(schema);
      expect(errors).toEqual([]);
    });

    test('You can have both a sort_field and and a sort_order', () => {
      const schema: FindRulesRequestQueryInput = {
        sort_field: 'name',
        sort_order: 'asc',
      };
      const errors = validateFindRulesRequestQuery(schema);
      expect(errors).toEqual([]);
    });

    test('You cannot have sort_field without sort_order', () => {
      const schema: FindRulesRequestQueryInput = {
        sort_field: 'name',
      };
      const errors = validateFindRulesRequestQuery(schema);
      expect(errors).toEqual([
        'when "sort_order" and "sort_field" must exist together or not at all',
      ]);
    });

    test('You cannot have sort_order without sort_field', () => {
      const schema: FindRulesRequestQueryInput = {
        sort_order: 'asc',
      };
      const errors = validateFindRulesRequestQuery(schema);
      expect(errors).toEqual([
        'when "sort_order" and "sort_field" must exist together or not at all',
      ]);
    });
  });
});
