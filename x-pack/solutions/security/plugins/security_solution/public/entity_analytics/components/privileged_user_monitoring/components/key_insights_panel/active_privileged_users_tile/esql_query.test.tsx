/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getActivePrivilegedUsersEsqlCount } from './esql_query';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';

// Mock the helper functions
jest.mock('../../../queries/helpers', () => ({
  getPrivilegedMonitorUsersJoin: jest.fn(
    (namespace: string) => `| JOIN privileged_users_${namespace} ON user.name`
  ),
}));

const mockDataView: DataViewSpec = {
  id: 'test-dataview',
  title: 'test-*',
  fields: {
    'user.name': { type: 'string' },
    '@timestamp': { type: 'date' },
  },
  timeFieldName: '@timestamp',
};

describe('getActivePrivilegedUsersEsqlCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a valid ESQL query with COUNT_DISTINCT', () => {
    const namespace = 'test-namespace';
    const result = getActivePrivilegedUsersEsqlCount(namespace, mockDataView);

    expect(result).toContain('FROM test-* METADATA _id, _index');
    expect(result).toContain('| JOIN privileged_users_test-namespace ON user.name');
    expect(result).toContain('| STATS `COUNT(*)` = COUNT_DISTINCT(user.name)');
  });

  it('should use the index pattern from the data view', () => {
    const namespace = 'test-namespace';
    const customDataView = {
      ...mockDataView,
      title: 'custom-index-*',
    };

    const result = getActivePrivilegedUsersEsqlCount(namespace, customDataView);

    expect(result).toContain('FROM custom-index-* METADATA _id, _index');
  });

  it('should handle empty data view title', () => {
    const namespace = 'test-namespace';
    const emptyDataView = {
      ...mockDataView,
      title: '',
    };

    const result = getActivePrivilegedUsersEsqlCount(namespace, emptyDataView);

    expect(result).toContain('FROM  METADATA _id, _index');
    expect(result).toContain('| STATS `COUNT(*)` = COUNT_DISTINCT(user.name)');
  });

  it('should handle undefined data view title', () => {
    const namespace = 'test-namespace';
    const undefinedDataView = {
      ...mockDataView,
      title: undefined,
    } as DataViewSpec;

    const result = getActivePrivilegedUsersEsqlCount(namespace, undefinedDataView);

    expect(result).toContain('FROM  METADATA _id, _index');
    expect(result).toContain('| STATS `COUNT(*)` = COUNT_DISTINCT(user.name)');
  });

  it('should pass correct namespace to helper function', () => {
    const namespace = 'test-namespace';
    const getPrivilegedMonitorUsersJoin = jest.requireMock(
      '../../../queries/helpers'
    ).getPrivilegedMonitorUsersJoin;

    getActivePrivilegedUsersEsqlCount(namespace, mockDataView);

    expect(getPrivilegedMonitorUsersJoin).toHaveBeenCalledWith(namespace);
  });
});
