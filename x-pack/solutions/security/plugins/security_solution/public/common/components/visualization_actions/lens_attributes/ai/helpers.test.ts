/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertIndexFilter } from './helpers';

describe('getAlertIndexFilter', () => {
  const defaultSignalIndexName = '.alerts-security.alerts-default';
  const defaultIndexPatternId = 'indexpattern-datasource-layer-unifiedHistogram';

  it('returns correct filter structure with default parameters', () => {
    const result = getAlertIndexFilter(defaultSignalIndexName);

    expect(result).toEqual({
      meta: {
        disabled: false,
        negate: false,
        alias: null,
        index: defaultIndexPatternId,
        key: '_index',
        field: '_index',
        params: {
          query: defaultSignalIndexName,
        },
        type: 'phrase',
      },
      query: {
        match_phrase: {
          _index: defaultSignalIndexName,
        },
      },
      $state: {
        store: 'appState',
      },
    });
  });

  it('returns correct filter structure with custom indexPatternId', () => {
    const customIndexPatternId = 'custom-index-pattern-id';
    const result = getAlertIndexFilter(defaultSignalIndexName, customIndexPatternId);

    expect(result.meta.index).toBe(customIndexPatternId);
    expect(result.meta.params.query).toBe(defaultSignalIndexName);
    expect(result.query.match_phrase._index).toBe(defaultSignalIndexName);
  });

  it('handles different signal index names correctly', () => {
    const testCases = [
      '.alerts-security.alerts-default',
      '.alerts-security.alerts-custom-space',
      '.alerts-security.alerts-space-123',
      'custom-alerts-index',
    ];

    testCases.forEach((signalIndexName) => {
      const result = getAlertIndexFilter(signalIndexName);

      expect(result.meta.params.query).toBe(signalIndexName);
      expect(result.query.match_phrase._index).toBe(signalIndexName);
      expect(result.meta.key).toBe('_index');
      expect(result.meta.field).toBe('_index');
    });
  });

  it('maintains consistent filter properties across different inputs', () => {
    const result = getAlertIndexFilter(defaultSignalIndexName);

    expect(result.meta.disabled).toBe(false);
    expect(result.meta.negate).toBe(false);
    expect(result.meta.alias).toBe(null);
    expect(result.meta.type).toBe('phrase');
    expect(result.$state.store).toBe('appState');
  });

  it('handles empty string signal index name', () => {
    const result = getAlertIndexFilter('');

    expect(result.meta.params.query).toBe('');
    expect(result.query.match_phrase._index).toBe('');
  });
});
