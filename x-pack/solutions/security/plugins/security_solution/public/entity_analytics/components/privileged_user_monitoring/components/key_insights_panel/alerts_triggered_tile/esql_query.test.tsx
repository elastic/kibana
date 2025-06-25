/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsTriggeredEsqlCount } from './esql_query';

// Mock the helper functions
jest.mock('../../../queries/helpers', () => ({
  getPrivilegedMonitorUsersJoin: jest.fn(
    (namespace: string) => `| JOIN privileged_users_${namespace} ON user.name`
  ),
}));

describe('getAlertsTriggeredEsqlCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a valid ESQL query with alerts index', () => {
    const namespace = 'test-namespace';
    const alertsIndexName = '.alerts-security.alerts-test';

    const result = getAlertsTriggeredEsqlCount(namespace, alertsIndexName);

    expect(result).toContain('FROM .alerts-security.alerts-test METADATA _id, _index');
    expect(result).toContain('| JOIN privileged_users_test-namespace ON user.name');
    expect(result).toContain('| STATS COUNT(*)');
  });

  it('should return empty string when alertsIndexName is null', () => {
    const namespace = 'test-namespace';
    const alertsIndexName = null;

    const result = getAlertsTriggeredEsqlCount(namespace, alertsIndexName);

    expect(result).toBe('');
  });

  it('should return empty string when alertsIndexName is undefined', () => {
    const namespace = 'test-namespace';
    const alertsIndexName = null;

    const result = getAlertsTriggeredEsqlCount(namespace, alertsIndexName);

    expect(result).toBe('');
  });

  it('should return empty string when alertsIndexName is empty string', () => {
    const namespace = 'test-namespace';
    const alertsIndexName = '';

    const result = getAlertsTriggeredEsqlCount(namespace, alertsIndexName);

    expect(result).toBe('');
  });

  it('should pass correct namespace to helper function', () => {
    const namespace = 'test-namespace';
    const alertsIndexName = '.alerts-security.alerts-test';
    const getPrivilegedMonitorUsersJoin = jest.requireMock(
      '../../../queries/helpers'
    ).getPrivilegedMonitorUsersJoin;

    getAlertsTriggeredEsqlCount(namespace, alertsIndexName);

    expect(getPrivilegedMonitorUsersJoin).toHaveBeenCalledWith(namespace);
  });

  it('should handle different alert index names', () => {
    const namespace = 'test-namespace';
    const alertsIndexName = '.alerts-security.alerts-custom';

    const result = getAlertsTriggeredEsqlCount(namespace, alertsIndexName);

    expect(result).toContain('FROM .alerts-security.alerts-custom METADATA _id, _index');
  });
});
