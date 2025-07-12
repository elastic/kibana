/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { intervalFromDate } from '@kbn/task-manager-plugin/server/lib/intervals';
import { nextExecution } from './health_diagnostic_utils';

describe('Security Solution - health diagnostic', () => {
  beforeEach(() => {});

  describe('Interval', () => {
    test.each([
      ['5m', '2025-05-14T17:00:00.000Z', '2025-05-14T17:05:00.000Z'],
      ['1h', '2025-05-14T17:00:00.000Z', '2025-05-14T18:00:00.000Z'],
      ['24h', '2025-05-14T17:00:00.000Z', '2025-05-15T17:00:00.000Z'],
      ['30d', '2025-05-31T17:00:00.000Z', '2025-06-30T17:00:00.000Z'],
      ['365d', '2025-05-31T17:00:00.000Z', '2026-05-31T17:00:00.000Z'],
    ])('adds %s to %s to equal %s', (interval, dateFrom, expected) => {
      const next = intervalFromDate(new Date(dateFrom), interval);
      expect(next).toEqual(new Date(expected));
    });
  });

  describe('nextExecution', () => {
    test.each([
      ['5m', '2025-05-14T17:00:00.000Z', '2025-05-14T17:03:00.000Z', false],
      ['5m', '2025-05-14T17:00:00.000Z', '2025-05-14T17:06:00.000Z', true],
      ['5m', '2025-05-14T17:00:00.000Z', '2025-05-14T18:03:00.000Z', true],
      ['1h', '2025-05-14T17:00:00.000Z', '2025-05-14T18:00:00.000Z', false],
      ['1h', '2025-05-14T17:00:00.000Z', '2025-05-14T18:01:00.000Z', true],
      ['1h', '2025-05-14T17:00:00.000Z', '2025-05-15T01:00:00.000Z', true],
      ['1h', '2025-05-14T17:00:00.000Z', '2025-05-12T01:00:00.000Z', false],
      ['1s', '2025-05-02T17:00:00.000Z', '2025-06-30T17:00:00.000Z', true],
      ['30d', '2025-05-31T17:00:00.000Z', '2025-06-29T17:00:00.000Z', false],
      ['365d', '2025-01-31T17:00:00.000Z', '2025-12-31T17:00:00.000Z', false],
    ])(
      'adds %s to %s when endDate is %s should return %s',
      (interval, startDate, endDate, validDate) => {
        const next = nextExecution(new Date(startDate), new Date(endDate), interval);

        expect(next !== undefined).toBe(validDate);
      }
    );
  });
});
