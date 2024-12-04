/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import {
  buildDocFetchAgg,
  buildNewTermsAgg,
  buildRecentTermsAgg,
} from './build_new_terms_aggregation';

describe('aggregations', () => {
  describe('buildRecentTermsAgg', () => {
    test('builds a correct composite agg without `after`', () => {
      const aggregation = buildRecentTermsAgg({
        fields: ['host.name'],
        after: undefined,
      });

      expect(aggregation).toMatchSnapshot();
    });

    test('builds a correct composite aggregation with `after`', () => {
      const aggregation = buildRecentTermsAgg({
        fields: ['host.name'],
        after: { 'host.name': 'myHost' },
      });

      expect(aggregation).toMatchSnapshot();
    });

    test('builds a correct composite aggregation with multiple fields', () => {
      const aggregation = buildRecentTermsAgg({
        fields: ['host.name', 'host.port', 'host.url'],
        after: undefined,
      });

      expect(aggregation).toMatchSnapshot();
    });
  });

  describe('buildNewTermsAggregation', () => {
    test('builds a correct aggregation with event.ingested', () => {
      const newValueWindowStart = moment(1650935705);
      const aggregation = buildNewTermsAgg({
        newValueWindowStart,
        field: 'host.name',
        timestampField: 'event.ingested',
        include: ['myHost'],
      });

      expect(aggregation).toMatchSnapshot();
    });

    test('builds a correct aggregation with @timestamp', () => {
      const newValueWindowStart = moment(1650000000);
      const aggregation = buildNewTermsAgg({
        newValueWindowStart,
        field: 'host.ip',
        timestampField: '@timestamp',
        include: ['myHost'],
      });

      expect(aggregation).toMatchSnapshot();
    });
  });

  describe('buildDocFetchAgg', () => {
    test('builds a correct top hits aggregation', () => {
      const aggregation = buildDocFetchAgg({
        field: 'host.name',
        timestampField: '@timestamp',
        include: ['myHost'],
      });

      expect(aggregation).toMatchSnapshot();
    });
  });
});
