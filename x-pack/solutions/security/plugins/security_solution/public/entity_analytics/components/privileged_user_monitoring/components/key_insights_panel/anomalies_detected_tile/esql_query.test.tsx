/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAnomaliesDetectedEsqlQuery } from './esql_query';

// Mock the helper functions
jest.mock('../../../queries/helpers', () => ({
  getPrivilegedMonitorUsersJoin: jest.fn(
    (namespace: string) => `| JOIN privileged_users_${namespace} ON user.name`
  ),
}));

describe('getAnomaliesDetectedEsqlQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a valid ESQL query for anomalies', () => {
    const namespace = 'test-namespace';

    const result = getAnomaliesDetectedEsqlQuery(namespace);

    expect(result).toContain('FROM .ml-anomalies-shared');
    expect(result).toContain('| WHERE record_score IS NOT NULL AND record_score > 0');
    expect(result).toContain('| WHERE user.name IS NOT NULL');
    expect(result).toContain('| JOIN privileged_users_test-namespace ON user.name');
    expect(result).toContain('| STATS COUNT(*)');
  });

  it('should pass correct namespace to helper function', () => {
    const namespace = 'test-namespace';
    const getPrivilegedMonitorUsersJoin = jest.requireMock(
      '../../../queries/helpers'
    ).getPrivilegedMonitorUsersJoin;

    getAnomaliesDetectedEsqlQuery(namespace);

    expect(getPrivilegedMonitorUsersJoin).toHaveBeenCalledWith(namespace);
  });

  it('should handle different namespaces', () => {
    const namespace = 'custom-namespace';

    const result = getAnomaliesDetectedEsqlQuery(namespace);

    expect(result).toContain('| JOIN privileged_users_custom-namespace ON user.name');
  });

  it('should always use the ml-anomalies-shared index', () => {
    const namespace = 'test-namespace';

    const result = getAnomaliesDetectedEsqlQuery(namespace);

    expect(result).toContain('FROM .ml-anomalies-shared');
  });

  it('should include all required WHERE clauses', () => {
    const namespace = 'test-namespace';

    const result = getAnomaliesDetectedEsqlQuery(namespace);

    // Check that the query includes the record_score filter
    expect(result).toContain('WHERE record_score IS NOT NULL AND record_score > 0');
    // Check that the query includes the user.name filter
    expect(result).toContain('WHERE user.name IS NOT NULL');
  });
});
