/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataViewSpecFromSearchConfig } from './get_data_view_spec';
import { DataViewSpec } from '@kbn/data-views-plugin/common';
import { SearchConfigurationWithExtractedReferenceType } from '../types';

describe('getDataViewSpecFromSearchConfig', () => {
  it('should return the data view spec when index is an adhoc object with id and title', () => {
    const adhocSpec: DataViewSpec = {
      id: 'adhoc-id',
      title: 'Adhoc Data View',
    };

    const config: SearchConfigurationWithExtractedReferenceType = {
      index: adhocSpec,
      query: { query: 'test', language: 'kuery' },
    };

    const result = getDataViewSpecFromSearchConfig(config);
    expect(result).toEqual(adhocSpec);
  });

  it('should return an object with id when index is a string (persistent data view)', () => {
    const config: SearchConfigurationWithExtractedReferenceType = {
      index: 'persistent-id',
      query: { query: 'test', language: 'kuery' },
    };

    const result = getDataViewSpecFromSearchConfig(config);
    expect(result).toEqual({ id: 'persistent-id' });
  });

  it('should return an object with id when index is an object with a title but no id', () => {
    const config: SearchConfigurationWithExtractedReferenceType = {
      index: { title: 'Custom Data View' } as DataViewSpec,
      query: { query: 'test', language: 'kuery' },
    };

    const result = getDataViewSpecFromSearchConfig(config);
    expect(result).toEqual({ id: 'Custom Data View' });
  });

  it('should return undefined when index is an object without title or id', () => {
    const config: SearchConfigurationWithExtractedReferenceType = {
      index: {} as DataViewSpec,
      query: { query: 'test', language: 'kuery' },
    };

    const result = getDataViewSpecFromSearchConfig(config);
    expect(result).toBeUndefined();
  });

  it('should return undefined when index is undefined', () => {
    const config: SearchConfigurationWithExtractedReferenceType = {
      index: undefined as any,
      query: { query: 'test', language: 'kuery' },
    };

    const result = getDataViewSpecFromSearchConfig(config);
    expect(result).toBeUndefined();
  });
});
