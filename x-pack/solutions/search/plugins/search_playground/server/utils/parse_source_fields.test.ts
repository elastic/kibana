/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseSourceFields } from './parse_source_fields';

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
