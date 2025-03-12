/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InspectIndexMapping } from './inspect_index_utils';
import {
  shallowObjectView,
  getEntriesAtKey,
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
    (mapping: InspectIndexMapping, key: string[], expectedResult: InspectIndexMapping) => {
      expect(getEntriesAtKey(mapping, key)).toEqual(expectedResult);
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
  ])(
    'shallowObjectView input %s returns %s',
    (mapping: InspectIndexMapping, maxDepth: number, expectedResult: unknown) => {
      expect(shallowObjectView(mapping, maxDepth)).toEqual(expectedResult);
    }
  );

  it('shallowObjectView returns undefined for undefined mapping', () => {
    expect(shallowObjectView(undefined)).toEqual('undefined');
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
});
