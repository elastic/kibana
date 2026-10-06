/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSourceEsql } from './validate_source_esql';

describe('validateSourceEsql', () => {
  it('returns the structural error', () => {
    expect(validateSourceEsql('FROM logs-* | STATS count(*)')).toMatch(/STATS/);
  });

  it('accepts a query whose indices are one type', () => {
    expect(validateSourceEsql('FROM my-a-*, my-b-*')).toBe(true);
  });

  it('rejects an unscoped wildcard', () => {
    expect(validateSourceEsql('FROM *')).toMatch(/unscoped wildcard/);
  });

  it('rejects a query that mixes types', () => {
    expect(validateSourceEsql('FROM logs-*, traces-*')).toMatch(/mixes/);
  });

  it('rejects a known type mixed with an unrecognized name', () => {
    expect(validateSourceEsql('FROM logs-*, my-app-*')).toMatch(/mixes/);
  });

  it('rejects an index that matches more than one type', () => {
    expect(validateSourceEsql('FROM logs-traces-*')).toMatch(/more than one kind/);
  });
});
