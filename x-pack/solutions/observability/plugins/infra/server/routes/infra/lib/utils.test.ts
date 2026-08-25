/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertQueryStructure, extractExcludedMetadataValues } from './utils';

const query = { bool: { must_not: [], filter: [], should: [], must: [] } };

describe('utils', () => {
  describe('extractExcludedMetadataValues', () => {
    test('returns empty map for undefined query', () => {
      expect(extractExcludedMetadataValues(undefined).size).toBe(0);
    });

    test('returns empty map for query without must_not', () => {
      expect(extractExcludedMetadataValues({ bool: { filter: [] } }).size).toBe(0);
    });

    test('extracts match_phrase values for metadata fields', () => {
      const result = extractExcludedMetadataValues({
        bool: { must_not: [{ match_phrase: { 'cloud.provider': 'gcp' } }] },
      });
      expect(result.get('cloud.provider')).toEqual(new Set(['gcp']));
    });

    test('extracts match values for metadata fields', () => {
      const result = extractExcludedMetadataValues({
        bool: { must_not: [{ match: { 'host.os.name': 'Linux' } }] },
      });
      expect(result.get('host.os.name')).toEqual(new Set(['Linux']));
    });

    test('extracts term values for metadata fields', () => {
      const result = extractExcludedMetadataValues({
        bool: { must_not: [{ term: { 'cloud.provider': { value: 'aws' } } }] },
      });
      expect(result.get('cloud.provider')).toEqual(new Set(['aws']));
    });

    test('extracts terms values for metadata fields', () => {
      const result = extractExcludedMetadataValues({
        bool: { must_not: [{ terms: { 'cloud.provider': ['aws', 'gcp'] } }] },
      });
      expect(result.get('cloud.provider')).toEqual(new Set(['aws', 'gcp']));
    });

    test('ignores non-metadata fields', () => {
      const result = extractExcludedMetadataValues({
        bool: { must_not: [{ match_phrase: { 'service.name': 'my-service' } }] },
      });
      expect(result.size).toBe(0);
    });

    test('handles multiple must_not clauses across fields', () => {
      const result = extractExcludedMetadataValues({
        bool: {
          must_not: [
            { match_phrase: { 'cloud.provider': 'gcp' } },
            { match_phrase: { 'host.os.name': 'Windows' } },
          ],
        },
      });
      expect(result.get('cloud.provider')).toEqual(new Set(['gcp']));
      expect(result.get('host.os.name')).toEqual(new Set(['Windows']));
    });

    test('handles bool.should inside must_not', () => {
      const result = extractExcludedMetadataValues({
        bool: {
          must_not: [
            {
              bool: {
                should: [
                  { match_phrase: { 'cloud.provider': 'gcp' } },
                  { match_phrase: { 'cloud.provider': 'aws' } },
                ],
              },
            },
          ],
        },
      });
      expect(result.get('cloud.provider')).toEqual(new Set(['gcp', 'aws']));
    });

    test('skips bool.should when must/filter are present (msm defaults to 0)', () => {
      const result = extractExcludedMetadataValues({
        bool: {
          must_not: [
            {
              bool: {
                must: [{ exists: { field: 'host.name' } }],
                should: [{ match_phrase: { 'host.os.name': 'Windows' } }],
              },
            },
          ],
        },
      });
      expect(result.size).toBe(0);
    });
  });

  describe('assertQueryStructure', () => {
    test('should successfully parse a partial query object', () => {
      const partialQuery = {
        ...query,
        bool: {
          filter: [],
        },
      };

      expect(() => assertQueryStructure(partialQuery)).not.toThrow();
    });

    test('should successfully parse query object', () => {
      expect(() => assertQueryStructure(query)).not.toThrow();
    });

    test('should fail to parse query object', () => {
      const anyObject = { test: [{ a: 1 }] };
      expect(() => assertQueryStructure(anyObject)).toThrow();
    });

    test('should fail to parse query object without any filter clause', () => {
      const anyObject = { bool: {} };
      expect(() => assertQueryStructure(anyObject)).toThrow();
    });
  });
});
