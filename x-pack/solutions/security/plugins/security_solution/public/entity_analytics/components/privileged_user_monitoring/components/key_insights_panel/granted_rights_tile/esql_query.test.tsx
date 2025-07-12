/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGrantedRightsEsqlCount } from './esql_query';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';

// Mock the helper functions
jest.mock('../../../queries/granted_rights_esql_query', () => ({
  getGrantedRightsEsqlSource: jest.fn(
    (namespace: string, indexPattern: string, fields: Record<string, { type: string }>) =>
      `FROM ${indexPattern} | WHERE granted_rights_field = "${namespace}"`
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

describe('getGrantedRightsEsqlCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a valid ESQL query with COUNT(*)', () => {
    const namespace = 'test-namespace';
    const result = getGrantedRightsEsqlCount(namespace, mockDataView);

    expect(result).toContain('FROM test-*');
    expect(result).toContain('WHERE granted_rights_field = "test-namespace"');
    expect(result).toContain('| STATS COUNT(*)');
  });

  it('should use the index pattern from the data view', () => {
    const namespace = 'test-namespace';
    const customDataView = {
      ...mockDataView,
      title: 'custom-index-*',
    };

    const result = getGrantedRightsEsqlCount(namespace, customDataView);

    expect(result).toContain('FROM custom-index-*');
  });

  it('should handle empty data view title', () => {
    const namespace = 'test-namespace';
    const emptyDataView = {
      ...mockDataView,
      title: '',
    };

    const result = getGrantedRightsEsqlCount(namespace, emptyDataView);

    expect(result).toContain('FROM ');
    expect(result).toContain('| STATS COUNT(*)');
  });

  it('should handle undefined data view title', () => {
    const namespace = 'test-namespace';
    const undefinedDataView = {
      ...mockDataView,
      title: undefined,
    } as DataViewSpec;

    const result = getGrantedRightsEsqlCount(namespace, undefinedDataView);

    expect(result).toContain('FROM ');
    expect(result).toContain('| STATS COUNT(*)');
  });

  it('should handle undefined data view fields', () => {
    const namespace = 'test-namespace';
    const undefinedFieldsDataView = {
      ...mockDataView,
      fields: undefined,
    } as DataViewSpec;

    const result = getGrantedRightsEsqlCount(namespace, undefinedFieldsDataView);

    expect(result).toContain('FROM test-*');
    expect(result).toContain('| STATS COUNT(*)');
  });

  it('should pass correct parameters to the source query function', () => {
    const namespace = 'test-namespace';
    const getGrantedRightsEsqlSource = jest.requireMock(
      '../../../queries/granted_rights_esql_query'
    ).getGrantedRightsEsqlSource;

    getGrantedRightsEsqlCount(namespace, mockDataView);

    expect(getGrantedRightsEsqlSource).toHaveBeenCalledWith(
      namespace,
      'test-*',
      mockDataView.fields
    );
  });
});
