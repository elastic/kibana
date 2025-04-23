/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  generateESQLSource,
  generateListESQLQuery,
  generateVisualizationESQLQuery,
  getBucketTimeRange,
  getFromTime,
  getToTime,
} from './esql_data_generation';

jest.mock('moment', () => {
  return () => jest.requireActual('moment')('2025-03-07T12:00:00Z');
});

jest.spyOn(global.Math, 'random').mockReturnValue(0.123456789);

describe('esql_data_generation', () => {
  describe('getToTime', () => {
    it('should return the start of the current hour', () => {
      const toTime = getToTime();
      expect(toTime.toISOString()).toBe('2025-03-07T12:00:00.000Z');
    });
  });

  describe('getFromTime', () => {
    it('should return 24 hours before the current hour', () => {
      const fromTime = getFromTime();
      expect(fromTime.toISOString()).toBe('2025-03-06T12:00:00.000Z');
    });
  });

  describe('getBucketTimeRange', () => {
    it('should return the correct time range excluding the current hour', () => {
      const bucketTimeRange = getBucketTimeRange();
      expect(bucketTimeRange).toEqual({
        from: '2025-03-06T12:00:00.000Z',
        to: '2025-03-07T11:00:00.000Z',
      });
    });
  });

  describe('generateESQLSource', () => {
    it('should generate the correct ESQL source string', () => {
      const esqlSource = generateESQLSource();
      expect(esqlSource).toMatchSnapshot();
    });
  });

  describe('generateListESQLQuery', () => {
    it('should generate the correct ESQL query for list pagination', () => {
      const generateQuery = generateListESQLQuery(generateESQLSource());
      const query = generateQuery('privileged_user', 'asc', 1);
      expect(query).toMatchSnapshot();
    });
  });

  describe('generateVisualizationESQLQuery', () => {
    it('should generate the correct ESQL query for visualization', () => {
      const generateQuery = generateVisualizationESQLQuery(generateESQLSource());
      const query = generateQuery('target_user');
      expect(query).toMatchSnapshot();
    });
  });
});
