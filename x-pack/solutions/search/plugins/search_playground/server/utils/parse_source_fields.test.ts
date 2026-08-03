/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_SOURCE_FIELDS_PER_INDEX, parseSourceFields } from './parse_source_fields';

describe('parseSourceFields', () => {
  it('should parse source fields with multiple index fields', () => {
    const sourceFields = JSON.stringify({
      'index-001': ['body', 'name'],
      'index-002': 'content',
    });
    const result = parseSourceFields(sourceFields);
    expect(result).toEqual({
      'index-001': ['body', 'name'],
      'index-002': 'content',
    });
  });

  it('should parse source fields with single index field', () => {
    const sourceFields = JSON.stringify({
      'index-002': ['content'],
    });
    const result = parseSourceFields(sourceFields);
    expect(result).toEqual({
      'index-002': 'content',
    });
  });

  it('should deduplicate source fields for an index', () => {
    const sourceFields = JSON.stringify({
      'index-001': ['body', 'name', 'body', 'name', 'body'],
    });
    const result = parseSourceFields(sourceFields);
    expect(result).toEqual({
      'index-001': ['body', 'name'],
    });
  });

  it('should collapse a duplicated single field to a string', () => {
    const sourceFields = JSON.stringify({
      'index-001': Array(1000).fill('description'),
    });
    const result = parseSourceFields(sourceFields);
    expect(result).toEqual({
      'index-001': 'description',
    });
  });

  it('should throw an error if unique source fields exceed the maximum per index', () => {
    const fields = Array.from({ length: MAX_SOURCE_FIELDS_PER_INDEX + 1 }, (_, i) => `field-${i}`);
    const sourceFields = JSON.stringify({
      'index-001': fields,
    });
    expect(() => parseSourceFields(sourceFields)).toThrowError(
      `source_fields for index "index-001" exceeds the maximum of ${MAX_SOURCE_FIELDS_PER_INDEX} fields`
    );
  });

  it('should throw an error if source fields contain non-string values', () => {
    const sourceFields = JSON.stringify({
      'index-001': ['body', 123],
    });
    expect(() => parseSourceFields(sourceFields)).toThrowError(
      'source_fields for index "index-001" must contain non-empty strings'
    );
  });

  it('should throw an error if source fields index value is empty', () => {
    const sourceFields = '{"foobar": []}';
    expect(() => parseSourceFields(sourceFields)).toThrowError(
      'source_fields index value cannot be empty'
    );
  });

  it('should throw an error if source fields index value is not an array or string', () => {
    const sourceFields = '{"foobar": 123}';
    expect(() => parseSourceFields(sourceFields)).toThrowError(
      'source_fields index value must be an array or string'
    );
  });

  it('should throw an error if source fields parameter is not a valid JSON string', () => {
    const sourceFields = 'invalid';
    expect(() => parseSourceFields(sourceFields)).toThrowError(
      `Unexpected token 'i', "invalid" is not valid JSON`
    );
  });

  it('should throw an error if source fields is not a JSON object', () => {
    const invalidSourceFields = [
      { sourceFields: `"test"`, errorMessage: 'source_fields must be a JSON object' },
      { sourceFields: `["foo", "bar"]`, errorMessage: 'source_fields must be a JSON object' },
      { sourceFields: '100', errorMessage: 'source_fields must be a JSON object' },
    ];
    for (const { sourceFields, errorMessage } of invalidSourceFields) {
      expect(() => {
        const result = parseSourceFields(sourceFields);
        expect(result).toBeUndefined();
      }).toThrowError(errorMessage);
    }
  });
});
