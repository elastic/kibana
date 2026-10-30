/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertValidEsqlSourceIndex, isValidEsqlSourceIndex } from './validate_esql_source_index';

describe('validate_esql_source_index', () => {
  describe('accepts legitimate index expressions', () => {
    it.each([
      '.alerts-security.alerts-default',
      '.alerts-security.alerts-alpha',
      '.alerts-security.alerts-default,.alerts-security.alerts-alpha',
      'logs-*',
      'logs-*,metrics-*',
      '.alerts-security.alerts-*',
      'remote_cluster:logs-*',
      '-excluded,.alerts-security.alerts-default',
      'my_index_name',
      // Characters that are valid in unquoted ES|QL source names and in index/data-view
      // titles, and must not be rejected.
      'alerts@prod',
      'alerts+prod',
      'alerts$prod',
      'alerts@prod,alerts+staging',
      'remote:alerts@prod',
    ])('%s', (index) => {
      expect(isValidEsqlSourceIndex(index)).toBe(true);
      expect(() => assertValidEsqlSourceIndex(index)).not.toThrow();
    });
  });

  describe('rejects values that could break out of the FROM clause', () => {
    it.each([
      ['empty string', ''],
      ['whitespace', '.alerts-security.alerts-default METADATA _index'],
      ['pipe', '.alerts-security.alerts-default|EVAL x=1'],
      ['double quote', '.alerts-security.alerts-default"'],
      ['single quote', ".alerts-security.alerts-default'"],
      ['backtick', '.alerts-security.alerts-default`'],
      ['line comment slashes', '.alerts-security.alerts-default//'],
      ['block comment', '.alerts-security.alerts-default/* * */'],
      ['parenthesis', '.alerts-security.alerts-default(1)'],
      ['newline', '.alerts-security.alerts-default\nFROM other'],
      ['semicolon', '.alerts-security.alerts-default;'],
      // Bad payload.
      [
        'report payload A',
        '.alerts-security.alerts-alpha,.alerts-security.alerts-beta,zz* METADATA _index,/* * */_source | EVAL `user.name`="svc-backup"',
      ],
    ])('%s', (_label, index) => {
      expect(isValidEsqlSourceIndex(index)).toBe(false);
      expect(() => assertValidEsqlSourceIndex(index)).toThrow(
        `Risk scoring source index ${index} is not a valid index expression`
      );
    });

    it('rejects an index expression longer than the maximum', () => {
      const tooLong = `a${'a'.repeat(4096)}`;
      expect(isValidEsqlSourceIndex(tooLong)).toBe(false);
      expect(() => assertValidEsqlSourceIndex(tooLong)).toThrow();
    });
  });
});
