/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { robustGet, robustSet, robustUnset } from './robust_field_access';

describe('robust field access', () => {
  describe('get', () => {
    it('fetches a value with basic key', () => {
      expect(robustGet({ key: 'a.b.c', document: { a: { b: { c: 'my-value' } } } })).toEqual(
        'my-value'
      );
    });

    it('fetches a value with mixed notation', () => {
      expect(robustGet({ key: 'a.b.c', document: { 'a.b': { c: 'my-value' } } })).toEqual(
        'my-value'
      );
    });

    it('fetches a value with different mixed notation', () => {
      expect(robustGet({ key: 'a.b.c', document: { a: { 'b.c': 'my-value' } } })).toEqual(
        'my-value'
      );
    });

    it('fetches a value using only dot notation', () => {
      expect(robustGet({ key: 'a.b.c', document: { 'a.b.c': 'my-value' } })).toEqual('my-value');
    });

    it('returns undefined if the key does not exist', () => {
      expect(robustGet({ key: 'a.b.c', document: { a: { b: 'my-value' } } })).toEqual(undefined);
    });
    it('returns an array if the key exists', () => {
      expect(robustGet({ key: 'a.b', document: { a: { b: ['my-value'] } } })).toEqual(['my-value']);
    });
  });

  describe('set', () => {
    it('sets a value with a basic key', () => {
      expect(robustSet({ key: 'a.b.c', valueToSet: 'test-value', document: {} })).toEqual({
        a: { b: { c: 'test-value' } },
      });
    });

    it('sets a value inside an object at a dot notation path', () => {
      expect(
        robustSet({ key: 'a.b.c', valueToSet: 'test-value', document: { 'a.b': {} } })
      ).toEqual({
        'a.b': { c: 'test-value' },
      });
    });

    it('sets a value inside an object at a nested notation path', () => {
      expect(
        robustSet({ key: 'a.b.c', valueToSet: 'test-value', document: { a: { b: {} } } })
      ).toEqual({
        a: { b: { c: 'test-value' } },
      });
    });

    it('sets a value and overwrites the existing value with dot notation', () => {
      expect(
        robustSet({ key: 'a.b.c', valueToSet: 'test-new', document: { 'a.b.c': 'test-original' } })
      ).toEqual({
        'a.b.c': 'test-new',
      });
    });

    it('sets a value and overwrites the existing value with nested notation', () => {
      expect(
        robustSet({
          key: 'a.b.c',
          valueToSet: 'test-new',
          document: { a: { b: { c: 'test-original' } } },
        })
      ).toEqual({
        a: { b: { c: 'test-new' } },
      });
    });

    it('sets a value and overwrites the existing value with mixed notation', () => {
      expect(
        robustSet({
          key: 'a.b.c',
          valueToSet: 'test-new',
          document: { 'a.b': { c: 'test-original' } },
        })
      ).toEqual({
        'a.b': { c: 'test-new' },
      });
    });

    it('sets a value and ignores non-object values on the path', () => {
      expect(
        robustSet({
          key: 'a.b.c',
          valueToSet: 'test-new',
          document: { 'a.b': 'test-ignore' },
        })
      ).toEqual({
        'a.b': 'test-ignore',
        a: { b: { c: 'test-new' } },
      });
    });

    it('sets the value correctly if an object already exists at the path', () => {
      expect(
        robustSet({
          key: 'a.b',
          valueToSet: 'test-new',
          document: { 'a.b': {} },
        })
      ).toEqual({ 'a.b': 'test-new' });
    });
  });

  describe('unset', () => {
    it('unsets a value with a basic key', () => {
      const document = { a: { b: { c: 'test-value', d: 'x' } } };
      robustUnset({ key: 'a.b.c', document });

      expect(document).toEqual({
        a: { b: { d: 'x' } },
      });
    });

    it('unsets a value with a basic key and remove empty objects', () => {
      const document = { a: { b: { c: 'test-value' } } };
      robustUnset({ key: 'a.b.c', document });

      expect(document).toEqual({});
    });

    it('unsets a value inside an object at a dot notation path', () => {
      const document = { 'a.b': { c: 'test-value', d: 'x' } };
      robustUnset({ key: 'a.b.c', document });

      expect(document).toEqual({
        'a.b': { d: 'x' },
      });
    });

    it('unsets a value inside an object at a dot notation path and removed empty object', () => {
      const document = { 'a.b': { c: 'test-value' } };
      robustUnset({ key: 'a.b.c', document });

      expect(document).toEqual({});
    });

    it('unsets a value with dot notation key', () => {
      const document = { 'a.b.c': 'test-value' };
      robustUnset({ key: 'a.b.c', document });

      expect(document).toEqual({});
    });

    it('ignores non-object values on the path', () => {
      const document = { 'a.b': 'test-ignore' };
      robustUnset({ key: 'a.b.c', document });

      expect(document).toEqual({
        'a.b': 'test-ignore',
      });
    });

    it('unsets object value', () => {
      const document = { 'a.b': { c: 1 } };
      robustUnset({ key: 'a.b', document });

      expect(document).toEqual({});
    });
  });
});
