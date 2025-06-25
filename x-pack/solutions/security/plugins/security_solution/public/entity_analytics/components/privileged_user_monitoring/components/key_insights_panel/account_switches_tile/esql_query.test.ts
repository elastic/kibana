/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copy// Mock the helper functions  
jest.mock('../../../queries/account_switches_esql_query', () => ({
  getAccountSwitchesEsqlSource: jest.fn((namespace: string, indexPattern: string, fields: Record<string, unknown>) => 
    `FROM ${indexPattern} | WHERE some_field = "${namespace}"`
  ),
}));lasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAccountSwitchesEsqlCount } from './esql_query';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';

// Mock the helper functions
jest.mock('../../../queries/account_switches_esql_query', () => ({
  getAccountSwitchesEsqlSource: jest.fn(
    (namespace: string, indexPattern: string, fields: Record<string, { type: string }>) =>
      `FROM ${indexPattern} | WHERE some_field = "${namespace}"`
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

describe('getAccountSwitchesEsqlCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a valid ESQL query with COUNT(*)', () => {
    const namespace = 'test-namespace';
    const result = getAccountSwitchesEsqlCount(namespace, mockDataView);

    expect(result).toContain('FROM test-*');
    expect(result).toContain('WHERE some_field = "test-namespace"');
    expect(result).toContain('| STATS COUNT(*)');
  });

  it('should use the index pattern from the data view', () => {
    const namespace = 'test-namespace';
    const customDataView = {
      ...mockDataView,
      title: 'custom-index-*',
    };

    const result = getAccountSwitchesEsqlCount(namespace, customDataView);

    expect(result).toContain('FROM custom-index-*');
  });

  it('should handle empty data view title', () => {
    const namespace = 'test-namespace';
    const emptyDataView = {
      ...mockDataView,
      title: '',
    };

    const result = getAccountSwitchesEsqlCount(namespace, emptyDataView);

    expect(result).toContain('FROM ');
    expect(result).toContain('| STATS COUNT(*)');
  });

  it('should handle undefined data view title', () => {
    const namespace = 'test-namespace';
    const undefinedDataView = {
      ...mockDataView,
      title: undefined,
    } as DataViewSpec;

    const result = getAccountSwitchesEsqlCount(namespace, undefinedDataView);

    expect(result).toContain('FROM ');
    expect(result).toContain('| STATS COUNT(*)');
  });

  it('should handle undefined data view fields', () => {
    const namespace = 'test-namespace';
    const undefinedFieldsDataView = {
      ...mockDataView,
      fields: undefined,
    } as DataViewSpec;

    const result = getAccountSwitchesEsqlCount(namespace, undefinedFieldsDataView);

    expect(result).toContain('FROM test-*');
    expect(result).toContain('| STATS COUNT(*)');
  });

  it('should pass correct parameters to the source query function', () => {
    const namespace = 'test-namespace';
    const getAccountSwitchesEsqlSource = jest.requireMock(
      '../../../queries/account_switches_esql_query'
    ).getAccountSwitchesEsqlSource;

    getAccountSwitchesEsqlCount(namespace, mockDataView);

    expect(getAccountSwitchesEsqlSource).toHaveBeenCalledWith(
      namespace,
      'test-*',
      mockDataView.fields
    );
  });
});
