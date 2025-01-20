/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateRandomIndexName, isValidIndexName, getFirstNewIndexName } from './indices';

describe('indices utils', function () {
  describe('generateRandomIndexName', function () {
    const DEFAULT_PREFIX = 'search-';
    const DEFAULT_SUFFIX_LENGTH = 4;
    it('defaults to search- with a 4 character suffix', () => {
      const indexName = generateRandomIndexName();

      expect(indexName.startsWith(DEFAULT_PREFIX)).toBe(true);
      expect(indexName.length).toBe(DEFAULT_PREFIX.length + DEFAULT_SUFFIX_LENGTH);
      expect(isValidIndexName(indexName)).toBe(true);
    });
    it('supports changing the prefix', () => {
      const otherPrefix = 'foo-';
      const indexName = generateRandomIndexName(otherPrefix);

      expect(indexName.startsWith(otherPrefix)).toBe(true);
      expect(indexName.length).toBe(otherPrefix.length + DEFAULT_SUFFIX_LENGTH);
      expect(isValidIndexName(indexName)).toBe(true);
    });
    it('supports changing the suffix length', () => {
      const indexName = generateRandomIndexName(undefined, 6);

      expect(indexName.startsWith(DEFAULT_PREFIX)).toBe(true);
      expect(indexName.length).toBe(DEFAULT_PREFIX.length + 6);
      expect(isValidIndexName(indexName)).toBe(true);
    });
    it('fallsback to single character suffix for invalid lengths', () => {
      let indexName = generateRandomIndexName(undefined, 0);

      expect(indexName.startsWith(DEFAULT_PREFIX)).toBe(true);
      expect(indexName.length).toBe(DEFAULT_PREFIX.length + 1);
      expect(isValidIndexName(indexName)).toBe(true);

      indexName = generateRandomIndexName(undefined, -5);
      expect(indexName.startsWith(DEFAULT_PREFIX)).toBe(true);
      expect(indexName.length).toBe(DEFAULT_PREFIX.length + 1);
      expect(isValidIndexName(indexName)).toBe(true);
    });
  });

  describe('getFirstNewIndexName', function () {
    it('returns undefined when lists are the same', () => {
      expect(getFirstNewIndexName([], [])).toEqual(undefined);
      expect(getFirstNewIndexName(['index'], ['index'])).toEqual(undefined);
      expect(getFirstNewIndexName(['index', 'test'], ['index', 'test'])).toEqual(undefined);
    });

    it('returns new item when it exists', () => {
      expect(getFirstNewIndexName([], ['index'])).toEqual('index');
      expect(getFirstNewIndexName(['index'], ['index', 'test'])).toEqual('test');
      expect(getFirstNewIndexName(['index', 'test'], ['index', 'test', 'unit-test'])).toEqual(
        'unit-test'
      );
      expect(getFirstNewIndexName(['index', 'test'], ['unit-test', 'index', 'test'])).toEqual(
        'unit-test'
      );
    });
    it('returns first new item when it multiple new indices exists', () => {
      expect(getFirstNewIndexName([], ['index', 'test'])).toEqual('index');
      expect(getFirstNewIndexName(['index'], ['test', 'index', 'unit-test'])).toEqual('test');
    });
    it('can handle old indices being removed', () => {
      expect(getFirstNewIndexName(['index'], ['test'])).toEqual('test');
      expect(getFirstNewIndexName(['test', 'index', 'unit-test'], ['index', 'new'])).toEqual('new');
    });
  });
});
