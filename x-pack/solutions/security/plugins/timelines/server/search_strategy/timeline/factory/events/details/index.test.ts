/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '../../../../../../common/search_strategy';
import { ENRICHMENT_DESTINATION_PATH } from '../../../../../../common/constants';
import { flattenNestedObject, addNestedFieldFromSource } from '.';

describe('addNestedFieldFromSource', () => {
  it('returns original fieldsData when source is undefined', () => {
    const fieldsData: TimelineEventsDetailsItem[] = [
      { field: 'test.field', values: ['value'], originalValue: ['value'], isObjectArray: false },
    ];

    const result = addNestedFieldFromSource(fieldsData, undefined, ENRICHMENT_DESTINATION_PATH);

    expect(result).toEqual(fieldsData);
  });

  it('returns original fieldsData when parent field already exists', () => {
    const fieldsData: TimelineEventsDetailsItem[] = [
      {
        field: ENRICHMENT_DESTINATION_PATH,
        values: ['{"indicator":{}}'],
        originalValue: ['{"indicator":{}}'],
        isObjectArray: true,
      },
    ];
    const source = {
      threat: {
        enrichments: [{ indicator: { type: 'file' } }],
      },
    };

    const result = addNestedFieldFromSource(fieldsData, source, ENRICHMENT_DESTINATION_PATH);

    expect(result).toEqual(fieldsData);
    expect(result).toHaveLength(1);
  });

  it('returns original fieldsData when nested data does not exist in source', () => {
    const fieldsData: TimelineEventsDetailsItem[] = [
      { field: 'test.field', values: ['value'], originalValue: ['value'], isObjectArray: false },
    ];
    const source = {
      threat: {},
    };

    const result = addNestedFieldFromSource(fieldsData, source, ENRICHMENT_DESTINATION_PATH);

    expect(result).toEqual(fieldsData);
  });

  it('adds parent field from source when nested data exists as array', () => {
    const fieldsData: TimelineEventsDetailsItem[] = [
      {
        field: 'threat.enrichments.matched.field',
        values: ['myhash.mysha256'],
        originalValue: ['myhash.mysha256'],
        isObjectArray: false,
      },
    ];
    const enrichmentData = {
      indicator: { type: 'file', first_seen: '2021-03-10T08:02:14.000Z' },
      matched: { field: 'myhash.mysha256', type: 'indicator_match_rule' },
    };
    const expectedFlattened = {
      'indicator.type': ['file'],
      'indicator.first_seen': ['2021-03-10T08:02:14.000Z'],
      'matched.field': ['myhash.mysha256'],
      'matched.type': ['indicator_match_rule'],
    };
    const source = {
      threat: {
        enrichments: [enrichmentData],
      },
    };

    const result = addNestedFieldFromSource(fieldsData, source, ENRICHMENT_DESTINATION_PATH);

    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({
      category: 'threat',
      field: ENRICHMENT_DESTINATION_PATH,
      values: [JSON.stringify(expectedFlattened)],
      originalValue: [JSON.stringify(expectedFlattened)],
      isObjectArray: true,
    });
  });

  it('adds parent field from source when nested data is a single object (not array)', () => {
    const fieldsData: TimelineEventsDetailsItem[] = [];
    const enrichmentData = {
      indicator: { type: 'ip' },
      matched: { field: 'source.ip' },
    };
    const expectedFlattened = {
      'indicator.type': ['ip'],
      'matched.field': ['source.ip'],
    };
    const source = {
      threat: {
        enrichments: enrichmentData, // single object, not array
      },
    };

    const result = addNestedFieldFromSource(fieldsData, source, ENRICHMENT_DESTINATION_PATH);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      category: 'threat',
      field: ENRICHMENT_DESTINATION_PATH,
      values: [JSON.stringify(expectedFlattened)],
      originalValue: [JSON.stringify(expectedFlattened)],
      isObjectArray: true,
    });
  });

  it('handles multiple enrichments in array', () => {
    const fieldsData: TimelineEventsDetailsItem[] = [];
    const enrichment1 = { indicator: { type: 'file' }, matched: { field: 'hash' } };
    const enrichment2 = { indicator: { type: 'ip' }, matched: { field: 'source.ip' } };
    const expectedFlattened1 = { 'indicator.type': ['file'], 'matched.field': ['hash'] };
    const expectedFlattened2 = { 'indicator.type': ['ip'], 'matched.field': ['source.ip'] };
    const source = {
      threat: {
        enrichments: [enrichment1, enrichment2],
      },
    };

    const result = addNestedFieldFromSource(fieldsData, source, ENRICHMENT_DESTINATION_PATH);

    expect(result).toHaveLength(1);
    expect(result[0].values).toEqual([
      JSON.stringify(expectedFlattened1),
      JSON.stringify(expectedFlattened2),
    ]);
  });

  it('correctly extracts category from field path', () => {
    const fieldsData: TimelineEventsDetailsItem[] = [];
    const source = {
      threat: {
        enrichments: [{ indicator: { type: 'test' } }],
      },
    };

    const result = addNestedFieldFromSource(fieldsData, source, ENRICHMENT_DESTINATION_PATH);

    expect(result[0].category).toBe('threat');
  });

  it('flattens deeply nested objects correctly', () => {
    const fieldsData: TimelineEventsDetailsItem[] = [];
    const enrichmentData = {
      indicator: {
        file: {
          hash: {
            sha256: 'abc123',
            md5: 'def456',
          },
          size: 80280,
        },
        type: 'file',
      },
      feed: {
        name: 'Test Feed',
      },
    };
    const expectedFlattened = {
      'indicator.file.hash.sha256': ['abc123'],
      'indicator.file.hash.md5': ['def456'],
      'indicator.file.size': [80280],
      'indicator.type': ['file'],
      'feed.name': ['Test Feed'],
    };
    const source = {
      threat: {
        enrichments: [enrichmentData],
      },
    };

    const result = addNestedFieldFromSource(fieldsData, source, ENRICHMENT_DESTINATION_PATH);

    expect(result).toHaveLength(1);
    expect(JSON.parse(result[0].values![0])).toEqual(expectedFlattened);
  });
});

describe('flattenNestedObject', () => {
  it('flattens simple nested object', () => {
    const obj = { a: { b: 'value' } };
    const result = flattenNestedObject(obj);
    expect(result).toEqual({ 'a.b': ['value'] });
  });

  it('flattens deeply nested object', () => {
    const obj = { a: { b: { c: { d: 'deep' } } } };
    const result = flattenNestedObject(obj);
    expect(result).toEqual({ 'a.b.c.d': ['deep'] });
  });

  it('handles arrays as leaf values', () => {
    const obj = { tags: ['tag1', 'tag2'] };
    const result = flattenNestedObject(obj);
    expect(result).toEqual({ tags: ['tag1', 'tag2'] });
  });

  it('handles numeric values', () => {
    const obj = { size: 80280, nested: { count: 5 } };
    const result = flattenNestedObject(obj);
    expect(result).toEqual({ size: [80280], 'nested.count': [5] });
  });

  it('handles null values', () => {
    const obj = { field: null };
    const result = flattenNestedObject(obj);
    expect(result).toEqual({ field: [null] });
  });
});
