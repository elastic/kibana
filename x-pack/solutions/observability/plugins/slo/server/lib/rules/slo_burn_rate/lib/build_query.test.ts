/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBurnRateRule } from '../fixtures/rule';
import { buildCandidatesQuery, buildQuery } from './build_query';
import {
  createKQLCustomIndicator,
  createSLO,
  createSLOWithTimeslicesBudgetingMethod,
} from '../../../../services/fixtures/slo';

const STARTED_AT = new Date('2023-01-01T00:00:00.000Z');

describe('buildQuery()', () => {
  it('should return a valid query for occurrences', () => {
    const slo = createSLO({
      id: 'test-slo',
      indicator: createKQLCustomIndicator(),
    });
    const rule = createBurnRateRule(slo);
    expect(buildQuery(STARTED_AT, slo, rule)).toMatchSnapshot();
  });

  it('should return a valid query with afterKey', () => {
    const slo = createSLO({
      id: 'test-slo',
      indicator: createKQLCustomIndicator(),
    });
    const rule = createBurnRateRule(slo);
    expect(buildQuery(STARTED_AT, slo, rule, { instanceId: 'example' })).toMatchSnapshot();
  });

  it('should return a valid query for timeslices', () => {
    const slo = createSLOWithTimeslicesBudgetingMethod({
      id: 'test-slo',
      indicator: createKQLCustomIndicator(),
    });
    const rule = createBurnRateRule(slo);
    expect(buildQuery(STARTED_AT, slo, rule)).toMatchSnapshot();
  });

  it('should restrict the query to the given instances', () => {
    const slo = createSLO({
      id: 'test-slo',
      indicator: createKQLCustomIndicator(),
    });
    const rule = createBurnRateRule(slo);
    expect(
      buildQuery(STARTED_AT, slo, rule, undefined, ['instance-a']).query.bool.filter
    ).toContainEqual({ terms: { 'slo.instanceId': ['instance-a'] } });
  });
});

describe('buildCandidatesQuery()', () => {
  it('should return a query for instances with bad occurrences in the longest short window', () => {
    const slo = createSLO({
      id: 'test-slo',
      indicator: createKQLCustomIndicator(),
    });
    const rule = createBurnRateRule(slo);
    expect(buildCandidatesQuery(STARTED_AT, slo, rule)).toMatchSnapshot();
  });

  it('should return a query for instances with bad slices in the longest short window', () => {
    const slo = createSLOWithTimeslicesBudgetingMethod({
      id: 'test-slo',
      indicator: createKQLCustomIndicator(),
    });
    const rule = createBurnRateRule(slo);
    expect(
      buildCandidatesQuery(STARTED_AT, slo, rule, { instanceId: 'example' })
    ).toMatchSnapshot();
  });
});
