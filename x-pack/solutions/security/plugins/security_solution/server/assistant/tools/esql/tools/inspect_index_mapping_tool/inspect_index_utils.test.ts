/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compressMapping } from '../../graphs/analyse_index_pattern/nodes/analyze_compressed_index_mapping_agent/compress_mapping';
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
    [
      {
        foo: [{ bar: 1 }, { bar: 2 }],
      },
      '.',
      {
        foo: [{ bar: 1 }, { bar: 2 }],
      },
    ],
  ])(
    'for %s getEntriesAtKey input %s returns %s',
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
        field1: '...',
        field2: '...',
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
          properties: '...',
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
        field1: '...',
        field2: '...',
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
        field2: '...',
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
          properties: '...',
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
    expect(shallowObjectView(sampleMapping1, 0)).toEqual('...');
  });

  it('shallowObjectViewTruncated returns truncated view', () => {
    expect(shallowObjectViewTruncated(sampleMapping1, 10)).toEqual({
      mappings: '...',
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
            properties: '...',
          },
        },
      },
    });
  });

  it('shallowObjectViewTruncated reduces depth if maxCharacters is exceeded', () => {
    expect(shallowObjectViewTruncated(sampleMapping1, 50)).toEqual({
      mappings: {
        properties: '...',
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

  it('1fieldDescriptor maps to nested object', () => {
    const fieldDescriptors = [
      {
        name: 'test',
        type: 'number',
        esTypes: ['long'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
      },
      {
        name: 'bar',
        type: 'number',
        esTypes: ['long'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
      },
      {
        name: 'dns.Ext.options',
        type: 'number',
        esTypes: ['long'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
      },
      {
        name: 'dns.Ext.status',
        type: 'number',
        esTypes: ['long'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
      },
      {
        name: 'dns.answers.class',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
      },
      {
        name: 'dns.answers.data',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
      },
      {
        name: 'dns.answers.name',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
      },
      {
        name: 'dns.answers.ttl',
        type: 'number',
        esTypes: ['long'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
      },
      {
        name: 'dns.answers.type',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
      },
      {
        name: 'dns.header_flags',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
      },
      {
        name: 'dns.id',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
      },
      {
        name: 'dns.op_code',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
      },
      {
        name: 'dns.question.class',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
      },
      {
        name: 'dns.question.name',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
      },
      {
        name: 'dns.question.registered_domain',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
      },
      {
        name: 'dns.question.subdomain',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
      },
      {
        name: 'dns.question.top_level_domain',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
      },
      {
        name: 'dns.question.type',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
      },
      {
        name: 'dns.resolved_ip',
        type: 'ip',
        esTypes: ['ip'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
      },
      {
        name: 'dns.response_code',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
        metadata_field: false,
      },
    ];

    const nestedObject = mapFieldDescriptorToNestedObject(
      fieldDescriptors.map((p) => ({ name: p.name, type: p.esTypes[0] }))
    );

    const result = compressMapping(nestedObject);
    expect(result).toEqual(
      `test,bar:long\ndns:{header_flags,id,op_code,response_code:keyword,resolved_ip:ip,Ext:{options,status:long},answers:{class,data,name,type:keyword,ttl:long},question:{class,name,registered_domain,subdomain,top_level_domain,type:keyword}}`
    );
  });
});
