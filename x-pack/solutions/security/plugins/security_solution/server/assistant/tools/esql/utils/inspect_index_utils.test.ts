/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetEntriesAtKeyMapping } from './inspect_index_utils';
import { formatEntriesAtKey, getEntriesAtKey } from './inspect_index_utils';

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
      ['mappings', 'properties'],
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
      ['mappings', 'properties', 'field1'],
      {
        type: 'keyword',
      },
    ],
  ])(
    'getEntriesAtKey input %s returns %s',
    (mapping: GetEntriesAtKeyMapping, key: string[], expectedResult: GetEntriesAtKeyMapping) => {
      expect(getEntriesAtKey(mapping, key)).toEqual(expectedResult);
    }
  );

  it.each([
    [
      {
        type: 'keyword',
      },1,
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
        },2,
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
      },1,
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
      },1,
      {
        field1: 'keyword',
        field2: 'Object',
      },
    ],
  ])(
    'formatEntriesAtKey input %s returns %s',
    (mapping: GetEntriesAtKeyMapping, maxDepth: number, expectedResult: Object) => {
      expect(formatEntriesAtKey(mapping, maxDepth)).toEqual(expectedResult);
    }
  );
});
