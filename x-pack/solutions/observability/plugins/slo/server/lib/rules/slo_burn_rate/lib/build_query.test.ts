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

  it('should only evaluate the given instances', () => {
    const slo = createSLO({ id: 'test-slo', indicator: createKQLCustomIndicator() });
    const rule = createBurnRateRule(slo);

    const { query } = buildQuery(STARTED_AT, slo, rule, undefined, ['host-a', 'host-b']);

    expect(query.bool.filter).toContainEqual({
      terms: { 'slo.instanceId': ['host-a', 'host-b'] },
    });
  });
});

describe('buildCandidatesQuery()', () => {
  it('should look up the instances breaching a short window for occurrences', () => {
    const slo = createSLO({ id: 'test-slo', indicator: createKQLCustomIndicator() });
    const rule = createBurnRateRule(slo);
    expect(buildCandidatesQuery(STARTED_AT, slo, rule)).toMatchSnapshot();
  });

  it('should cover the longest short window, whatever the windows order', () => {
    const slo = createSLO({ id: 'test-slo', indicator: createKQLCustomIndicator() });
    const rule = createBurnRateRule(slo);
    const reversedRule = { ...rule, windows: [...rule.windows].reverse() };

    expect(buildCandidatesQuery(STARTED_AT, slo, reversedRule).query).toEqual(
      buildCandidatesQuery(STARTED_AT, slo, rule).query
    );
  });

  it('should look up the instances breaching a short window from their bad slices for timeslices', () => {
    const slo = createSLOWithTimeslicesBudgetingMethod({
      id: 'test-slo',
      indicator: createKQLCustomIndicator(),
    });
    const rule = createBurnRateRule(slo);
    expect(buildCandidatesQuery(STARTED_AT, slo, rule)).toMatchSnapshot();
  });

  it('should continue after the given key', () => {
    const slo = createSLO({ id: 'test-slo', indicator: createKQLCustomIndicator() });
    const rule = createBurnRateRule(slo);

    const { aggs } = buildCandidatesQuery(STARTED_AT, slo, rule, { instanceId: 'host-a' });

    expect(aggs.instances.composite.after).toEqual({ instanceId: 'host-a' });
  });
});
