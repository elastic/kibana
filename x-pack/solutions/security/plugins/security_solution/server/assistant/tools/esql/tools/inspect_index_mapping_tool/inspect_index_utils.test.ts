/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getNestedValue,
  mapFieldDescriptorToNestedObject,
  shallowObjectView,
  shallowObjectViewTruncated,
} from './inspect_index_utils';

const sampleMapping1 = {
  mappings: {
    properties: {
      field1: {
        type: 'keyword',
      },
      field2: {
        properties: {
          nested_field: {
            type: 'keyword',
          },
        },
      },
    },
  },
};

describe('inspect index', () => {
  it.each([
    [
      sampleMapping1,
      'mappings.properties',
      {
        field1: {
          type: 'keyword',
        },
        field2: {
          properties: {
            nested_field: {
              type: 'keyword',
            },
          },
        },
      },
    ],
    [
      sampleMapping1,
      'mappings.properties.field1',
      {
        type: 'keyword',
      },
    ],
    [
      {
        foo: [{ bar: 1 }, { bar: 2 }],
      },
      'foo.1.bar',
      2,
    ],
    [
      {
        foo: [{ bar: 1 }, { bar: 2 }],
      },
      '',
      {
        foo: [{ bar: 1 }, { bar: 2 }],
      },
    ],
  ])(
    'getEntriesAtKey input %s returns %s',
    (mapping: unknown, key: string, expectedResult: unknown) => {
      expect(getNestedValue(mapping, key)).toEqual(expectedResult);
    }
  );

  it.each([
    [
      {
        type: 'keyword',
      },
      1,
      {
        type: 'keyword',
      },
    ],
    [
      {
        field1: {
          type: 'keyword',
        },
        field2: {
          properties: {
            nested_field: {
              type: 'keyword',
            },
          },
        },
      },
      1,
      {
        field1: 'Object',
        field2: 'Object',
      },
    ],
    [
      {
        field1: {
          type: 'keyword',
        },
        field2: {
          properties: {
            nested_field: {
              type: 'keyword',
            },
          },
        },
      },
      2,
      {
        field1: {
          type: 'keyword',
        },
        field2: {
          properties: 'Object',
        },
      },
    ],
    [
      {
        field1: {
          type: 'keyword',
        },
        field2: {
          properties: {
            nested_field: {
              type: 'keyword',
            },
          },
        },
      },
      1,
      {
        field1: 'Object',
        field2: 'Object',
      },
    ],
    [
      {
        field1: 'keyword',
        field2: {
          properties: {
            nested_field: {
              type: 'keyword',
            },
          },
        },
      },
      1,
      {
        field1: 'keyword',
        field2: 'Object',
      },
    ],
    [
      {
        field1: [1, 2, 3],
        field2: {
          properties: {
            nested_field: {
              type: 'keyword',
            },
          },
        },
      },
      2,
      {
        field1: [1, 2, 3],
        field2: {
          properties: 'Object',
        },
      },
    ],
  ])(
    'shallowObjectView input %s returns %s',
    (mapping: unknown, maxDepth: number, expectedResult: unknown) => {
      expect(shallowObjectView(mapping, maxDepth)).toEqual(expectedResult);
    }
  );

  it('shallowObjectView returns undefined for undefined mapping', () => {
    expect(shallowObjectView(undefined)).toEqual(undefined);
  });

  it('shallowObjectView returns mapping for string mapping', () => {
    expect(shallowObjectView('string')).toEqual('string');
  });

  it('shallowObjectView returns Object for maxDepth 0', () => {
    expect(shallowObjectView(sampleMapping1, 0)).toEqual('Object');
  });

  it('shallowObjectViewTruncated returns truncated view', () => {
    expect(shallowObjectViewTruncated(sampleMapping1, 10)).toEqual({
      mappings: 'Object',
    });
  });

  it('shallowObjectViewTruncated does not reduce depth if maxCharacters is not exceeded', () => {
    expect(shallowObjectViewTruncated(sampleMapping1, 200)).toEqual({
      mappings: {
        properties: {
          field1: {
            type: 'keyword',
          },
          field2: {
            properties: 'Object',
          },
        },
      },
    });
  });

  it('shallowObjectViewTruncated reduces depth if maxCharacters is exceeded', () => {
    expect(shallowObjectViewTruncated(sampleMapping1, 50)).toEqual({
      mappings: {
        properties: 'Object',
      },
    });
  });

  it('fieldDescriptor maps to nested object', () => {
    const fieldDescriptors = [
      {
        name: '@timestamp',
        type: 'date',
        esTypes: ['date'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
        fixedInterval: undefined,
        timeZone: undefined,
        timeSeriesMetric: undefined,
        timeSeriesDimension: undefined,
      },
      {
        name: 'effective_process.entity_id',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
        fixedInterval: undefined,
        timeZone: undefined,
        timeSeriesMetric: undefined,
        timeSeriesDimension: undefined,
      },
      {
        name: 'effective_process.executable',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
        fixedInterval: undefined,
        timeZone: undefined,
        timeSeriesMetric: undefined,
        timeSeriesDimension: undefined,
      },
    ];

    const nestedObject = mapFieldDescriptorToNestedObject(fieldDescriptors);
    expect(nestedObject).toEqual({
      '@timestamp': {
        aggregatable: true,
        esTypes: ['date'],
        fixedInterval: undefined,
        metadata_field: false,
        readFromDocValues: true,
        searchable: true,
        timeSeriesDimension: undefined,
        timeSeriesMetric: undefined,
        timeZone: undefined,
        type: 'date',
      },
      effective_process: {
        entity_id: {
          aggregatable: true,
          esTypes: ['keyword'],
          fixedInterval: undefined,
          metadata_field: false,
          readFromDocValues: true,
          searchable: true,
          timeSeriesDimension: undefined,
          timeSeriesMetric: undefined,
          timeZone: undefined,
          type: 'string',
        },
        executable: {
          aggregatable: true,
          esTypes: ['keyword'],
          fixedInterval: undefined,
          metadata_field: false,
          readFromDocValues: true,
          searchable: true,
          timeSeriesDimension: undefined,
          timeSeriesMetric: undefined,
          timeZone: undefined,
          type: 'string',
        },
      },
    });
  });
});
