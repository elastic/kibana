/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
