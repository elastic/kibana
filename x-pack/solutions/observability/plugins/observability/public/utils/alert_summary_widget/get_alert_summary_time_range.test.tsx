/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { getAlertSummaryTimeRange, getDefaultAlertSummaryTimeRange } from '.';

describe('AlertSummaryTimeRange', () => {
  describe('getDefaultAlertSummaryTimeRange', () => {
    it('should return default time in UTC format', () => {
      const utcFormat = 'YYYY-MM-DDTHH:mm:ss.SSSZ';
      const defaultTimeRange = getDefaultAlertSummaryTimeRange();

      expect(moment(defaultTimeRange.utcFrom, utcFormat, true).isValid()).toBeTruthy();
      expect(moment(defaultTimeRange.utcTo, utcFormat, true).isValid()).toBeTruthy();
    });
  });

  describe('getAlertSummaryTimeRange', () => {
    const utcRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z/;

    it.each([
      // 15 minutes
      ['2023-01-09T12:07:54.441Z', '2023-01-09T12:22:54.441Z', '30s', 'HH:mm:ss'],
      ['now-15m', 'now', '30s', 'HH:mm:ss'],
    ])(
      `Input: [%s, %s, %s, %s] should return dates in UTC format`,
      (from, to, fixedInterval, dateFormat) => {
        expect(getAlertSummaryTimeRange({ from, to }, fixedInterval, dateFormat)).toMatchObject({
          utcFrom: expect.stringMatching(new RegExp(utcRegex)),
          utcTo: expect.stringMatching(new RegExp(utcRegex)),
          fixedInterval,
          dateFormat,
        });
      }
    );
  });
});
