/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type { DataViewBase } from '@kbn/es-query';
import type { MetricExpressionParams } from '../../../../../common/alerting/metrics';
import { Aggregators } from '../../../../../common/alerting/metrics';
import { getElasticsearchMetricQuery } from './metric_query';

describe("The Metric Threshold Alert's getElasticsearchMetricQuery", () => {
  const expressionParams: MetricExpressionParams = {
    metric: 'system.is.a.good.puppy.dog',
    aggType: Aggregators.AVERAGE,
    timeUnit: 'm',
    timeSize: 1,
    threshold: [1],
    comparator: COMPARATORS.GREATER_THAN,
  };

  const groupBy = 'host.doggoname';
  const timeframe = {
    start: moment().subtract(5, 'minutes').valueOf(),
    end: moment().valueOf(),
  };

  describe('when passed no filterQuery', () => {
    const searchBody = getElasticsearchMetricQuery(
      expressionParams,
      timeframe,
      100,
      true,
      void 0,
      groupBy
    );
    test('includes a range filter', () => {
      expect(
        searchBody.query.bool.filter.find((filter) => Object.hasOwn(filter, 'range'))
      ).toBeTruthy();
    });

    test('includes a metric field filter', () => {
      expect(searchBody.query.bool.filter).toMatchObject(
        expect.arrayContaining([{ exists: { field: 'system.is.a.good.puppy.dog' } }])
      );
    });
  });

  describe('when using a custom aggregation with a wildcard KQL filter on a keyword field', () => {
    const dataView: DataViewBase = {
      title: 'metrics-*',
      fields: [{ name: 'machine.os.keyword', type: 'string', esTypes: ['keyword'] }],
    };

    const customParams: MetricExpressionParams = {
      aggType: Aggregators.CUSTOM,
      timeUnit: 'm',
      timeSize: 1,
      threshold: [0],
      comparator: COMPARATORS.GREATER_THAN,
      customMetrics: [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
          filter: 'machine.os.keyword: *win 7*',
        },
      ],
    };

    const searchBodyWithDataView = getElasticsearchMetricQuery(
      customParams,
      timeframe,
      100,
      true,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      dataView
    );

    const searchBodyWithoutDataView = getElasticsearchMetricQuery(
      customParams,
      timeframe,
      100,
      true
    );

    test('generates a wildcard query when dataView is provided', () => {
      const filterAgg =
        searchBodyWithDataView.aggs.all.aggs.currentPeriod.aggs.aggregatedValue_A.filter;
      expect(JSON.stringify(filterAgg)).not.toContain('query_string');
      expect(JSON.stringify(filterAgg)).toContain('wildcard');
    });

    test('generates a query_string when no dataView is provided', () => {
      const filterAgg =
        searchBodyWithoutDataView.aggs.all.aggs.currentPeriod.aggs.aggregatedValue_A.filter;
      expect(JSON.stringify(filterAgg)).toContain('query_string');
    });
  });

  describe('when passed a filterQuery', () => {
    const filterQuery =
      // This is adapted from a real-world query that previously broke alerts
      // We want to make sure it doesn't override any existing filters
      '{"bool":{"filter":[{"bool":{"filter":[{"bool":{"must_not":[{"bool":{"should":[{"query_string":{"query":"bark*","fields":["host.name^1.0"],"type":"best_fields","default_operator":"or","max_determinized_states":10000,"enable_position_increments":true,"fuzziness":"AUTO","fuzzy_prefix_length":0,"fuzzy_max_expansions":50,"phrase_slop":0,"escape":false,"auto_generate_synonyms_phrase_query":true,"fuzzy_transpositions":true,"boost":1}}],"adjust_pure_negative":true,"minimum_should_match":"1","boost":1}}],"adjust_pure_negative":true,"boost":1}},{"bool":{"must_not":[{"bool":{"should":[{"query_string":{"query":"woof*","fields":["host.name^1.0"],"type":"best_fields","default_operator":"or","max_determinized_states":10000,"enable_position_increments":true,"fuzziness":"AUTO","fuzzy_prefix_length":0,"fuzzy_max_expansions":50,"phrase_slop":0,"escape":false,"auto_generate_synonyms_phrase_query":true,"fuzzy_transpositions":true,"boost":1}}],"adjust_pure_negative":true,"minimum_should_match":"1","boost":1}}],"adjust_pure_negative":true,"boost":1}}],"adjust_pure_negative":true,"boost":1}}],"adjust_pure_negative":true,"boost":1}}';

    const searchBody = getElasticsearchMetricQuery(
      expressionParams,
      timeframe,
      100,
      true,
      void 0,
      groupBy,
      filterQuery
    );
    test('includes a range filter', () => {
      expect(
        searchBody.query.bool.filter.find((filter) => Object.hasOwn(filter, 'range'))
      ).toBeTruthy();
    });

    test('includes a metric field filter', () => {
      expect(searchBody.query.bool.filter).toMatchObject(
        expect.arrayContaining([{ exists: { field: 'system.is.a.good.puppy.dog' } }])
      );
    });
  });
});
