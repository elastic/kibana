/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, Walker } from '@elastic/esql';
import { Duration, DurationUnit } from '../../../../domain/models';
import { createBurnRateRule } from '../fixtures/rule';
import { buildEvaluationFilter, buildEvaluationQuery } from './build_query';
import {
  createKQLCustomIndicator,
  createSLO,
  createSLOWithTimeslicesBudgetingMethod,
} from '../../../../services/fixtures/slo';

const STARTED_AT = new Date('2023-01-01T00:00:00.000Z');

describe('buildEvaluationQuery()', () => {
  it('should return a valid query for occurrences', () => {
    const slo = createSLO({
      id: 'test-slo',
      indicator: createKQLCustomIndicator(),
    });
    const rule = createBurnRateRule(slo);
    expect(buildEvaluationQuery(STARTED_AT, slo, rule, 1001)).toMatchSnapshot();
  });

  it('should return a valid query for timeslices', () => {
    const slo = createSLOWithTimeslicesBudgetingMethod({
      id: 'test-slo',
      indicator: createKQLCustomIndicator(),
    });
    const rule = createBurnRateRule(slo);
    expect(buildEvaluationQuery(STARTED_AT, slo, rule, 1001)).toMatchSnapshot();
  });

  it('should only select the burn rates of the configured windows', () => {
    const slo = createSLO({
      id: 'test-slo',
      indicator: createKQLCustomIndicator(),
    });
    const rule = createBurnRateRule(slo);
    const { query } = buildEvaluationQuery(
      STARTED_AT,
      slo,
      { ...rule, windows: [rule.windows[1]] },
      10
    );

    expect(query).toContain(
      'EVAL window_index = CASE(w0_short_burn_rate >= ?w0_threshold AND w0_long_burn_rate >= ?w0_threshold, 0)'
    );
    expect(query).toContain(
      'EVAL short_window_burn_rate = CASE(window_index == 0, w0_short_burn_rate), long_window_burn_rate = CASE(window_index == 0, w0_long_burn_rate)'
    );
    expect(query).not.toContain('w1_');
    expect(query).toContain('| LIMIT 10');
  });

  it('should not divide by the slices of a timeslices window shorter than the timeslice window', () => {
    const slo = createSLOWithTimeslicesBudgetingMethod({
      id: 'test-slo',
      indicator: createKQLCustomIndicator(),
      objective: {
        target: 0.98,
        timesliceTarget: 0.95,
        timesliceWindow: new Duration(1, DurationUnit.Hour),
      },
    });
    const rule = createBurnRateRule(slo);
    const { query, params } = buildEvaluationQuery(
      STARTED_AT,
      slo,
      { ...rule, windows: [rule.windows[0]] },
      10
    );

    expect(query).toContain('w0_short_burn_rate = 0.0');
    expect(params).not.toContainEqual({ w0_short_slices: expect.anything() });
    expect(params).toContainEqual({ w0_long_slices: 1 });
  });

  describe.each([
    ['occurrences', createSLO({ id: 'test-slo', indicator: createKQLCustomIndicator() })],
    [
      'timeslices',
      createSLOWithTimeslicesBudgetingMethod({
        id: 'test-slo',
        indicator: createKQLCustomIndicator(),
      }),
    ],
  ])('for %s', (_, slo) => {
    const { query, params } = buildEvaluationQuery(STARTED_AT, slo, createBurnRateRule(slo), 1001);

    it('should return a query without syntax errors', () => {
      expect(Parser.parse(query).errors).toEqual([]);
    });

    it('should provide every named parameter referenced by the query, and only those', () => {
      const referencedParams = Walker.params(Parser.parse(query).root);
      const providedNames = params.flatMap((param) => Object.keys(param));

      expect(referencedParams.every(({ paramType }) => paramType === 'named')).toBe(true);
      expect(new Set(providedNames)).toEqual(
        new Set(referencedParams.map(({ value }) => String(value)))
      );
      expect(providedNames).toHaveLength(new Set(providedNames).size);
    });
  });
});

describe('buildEvaluationFilter()', () => {
  it('should cover the longest window, shifted by the SLO delay', () => {
    const slo = createSLO({
      id: 'test-slo',
      indicator: createKQLCustomIndicator(),
    });
    const rule = createBurnRateRule(slo);

    expect(buildEvaluationFilter(STARTED_AT, slo, rule)).toMatchSnapshot();
  });
});
