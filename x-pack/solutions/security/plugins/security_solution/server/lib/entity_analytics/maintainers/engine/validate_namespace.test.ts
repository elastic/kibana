/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertValidNamespace, InvalidNamespaceError } from './validate_namespace';

describe('assertValidNamespace', () => {
  describe('accepts realistic namespaces', () => {
    it.each([
      'default',
      'prod',
      'staging',
      'customer-1',
      'tenant_a',
      'a',
      '0',
      '123',
      'a-b_c-d',
      'a'.repeat(100),
    ])('accepts %p', (ns) => {
      expect(() => assertValidNamespace(ns)).not.toThrow();
    });
  });

  describe('rejects empty / overlong / whitespace inputs', () => {
    it.each([
      ['empty string', ''],
      ['single space', ' '],
      ['surrounding whitespace', ' default '],
      ['internal whitespace', 'foo bar'],
      ['tab', 'a\tb'],
      ['newline', 'a\nb'],
      ['101 characters', 'a'.repeat(101)],
    ])('rejects %s', (_label, ns) => {
      expect(() => assertValidNamespace(ns)).toThrow(InvalidNamespaceError);
    });
  });

  describe('rejects characters that could break out of FROM clauses', () => {
    it.each([
      ['single quote', "foo'bar"],
      ['double quote', 'foo"bar'],
      ['backtick', 'foo`bar'],
      ['semicolon', 'foo;bar'],
      ['comma', 'foo,bar'],
      ['parentheses', 'foo(bar'],
      ['asterisk', 'foo*bar'],
      ['question mark', 'foo?bar'],
      ['pipe', 'foo|bar'],
      ['forward slash', 'foo/bar'],
      ['backslash', 'foo\\bar'],
      ['dollar sign', 'foo$bar'],
      ['curly brace', 'foo{bar}'],
      ['hash', 'foo#bar'],
      ['null byte', 'foo\u0000bar'],
    ])('rejects %s', (_label, ns) => {
      // Test name uses only the label (not %p) so that values containing
      // unprintable bytes (e.g. \u0000) do not end up in the JUnit XML
      // attribute, which the XML serializer rejects with
      // "Invalid character in string ... at index undefined".
      expect(() => assertValidNamespace(ns)).toThrow(InvalidNamespaceError);
    });
  });

  describe('rejects inputs that index naming conventions disallow', () => {
    it.each([
      ['uppercase letter', 'Default'],
      ['leading hyphen', '-default'],
      ['leading underscore', '_default'],
      ['leading dot', '.kibana'],
      ['unicode', 'café'],
      ['emoji', '😀'],
    ])('rejects %s', (_label, ns) => {
      expect(() => assertValidNamespace(ns)).toThrow(InvalidNamespaceError);
    });
  });

  it('error message includes the offending value (quoted) and the pattern source', () => {
    try {
      assertValidNamespace('Bad/Value');
      fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidNamespaceError);
      expect((err as Error).message).toContain('"Bad/Value"');
      expect((err as Error).message).toMatch(/\^\[a-z0-9\]/);
    }
  });
});
