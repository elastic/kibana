/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertIdsQuery } from '.';

describe('getAlertIdsQuery', () => {
  const alertsIndexPattern = '.alerts-security.alerts-*';
  const alertIds = ['alert-1', 'alert-2', 'alert-3'];

  it('returns query with correct index pattern', () => {
    const result = getAlertIdsQuery(alertsIndexPattern, alertIds);

    expect(result.index).toBe(alertsIndexPattern);
  });

  it('returns query with ids query containing all alert IDs', () => {
    const result = getAlertIdsQuery(alertsIndexPattern, alertIds);

    expect(result.query.ids.values).toEqual(alertIds);
  });

  it('returns query with size matching alert IDs length', () => {
    const result = getAlertIdsQuery(alertsIndexPattern, alertIds);

    expect(result.size).toBe(alertIds.length);
  });

  it('returns query with _source set to false', () => {
    const result = getAlertIdsQuery(alertsIndexPattern, alertIds);

    expect(result._source).toBe(false);
  });

  it('returns query with ignore_unavailable set to true', () => {
    const result = getAlertIdsQuery(alertsIndexPattern, alertIds);

    expect(result.ignore_unavailable).toBe(true);
  });
});
