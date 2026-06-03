/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertIdsQuery } from '.';

describe('getAlertIdsQuery', () => {
  const alertsIndexPattern = '.alerts-security.alerts-*';

  it('returns the expected query for an empty array', () => {
    const result = getAlertIdsQuery(alertsIndexPattern, []);

    expect(result).toEqual({
      _source: false,
      ignore_unavailable: true,
      index: alertsIndexPattern,
      query: {
        ids: {
          values: [],
        },
      },
      size: 0,
    });
  });

  it('returns the expected query for a single alert ID', () => {
    const result = getAlertIdsQuery(alertsIndexPattern, ['alert-1']);

    expect(result).toEqual({
      _source: false,
      ignore_unavailable: true,
      index: alertsIndexPattern,
      query: {
        ids: {
          values: ['alert-1'],
        },
      },
      size: 1,
    });
  });

  it('returns the expected query for multiple alert IDs', () => {
    const alertIds = ['alert-1', 'alert-2', 'alert-3'];
    const result = getAlertIdsQuery(alertsIndexPattern, alertIds);

    expect(result).toEqual({
      _source: false,
      ignore_unavailable: true,
      index: alertsIndexPattern,
      query: {
        ids: {
          values: alertIds,
        },
      },
      size: 3,
    });
  });

  it('sets _source to false for performance', () => {
    const result = getAlertIdsQuery(alertsIndexPattern, ['alert-1']);

    expect(result._source).toBe(false);
  });

  it('sets ignore_unavailable to true', () => {
    const result = getAlertIdsQuery(alertsIndexPattern, ['alert-1']);

    expect(result.ignore_unavailable).toBe(true);
  });

  it('uses the provided index pattern', () => {
    const customPattern = '.custom-alerts-*';
    const result = getAlertIdsQuery(customPattern, ['alert-1']);

    expect(result.index).toBe(customPattern);
  });

  it('sets size to match the number of alert IDs', () => {
    const alertIds = ['alert-1', 'alert-2', 'alert-3', 'alert-4', 'alert-5'];
    const result = getAlertIdsQuery(alertsIndexPattern, alertIds);

    expect(result.size).toBe(5);
  });
});
