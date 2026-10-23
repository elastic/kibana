/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSourceEsql } from './validate_source_esql';

describe('validateSourceEsql', () => {
  it('returns true for a query whose indices are one type', () => {
    expect(validateSourceEsql('FROM my-a-*, my-b-*')).toBe(true);
  });

  it('returns the structural error message', () => {
    expect(validateSourceEsql('FROM logs-* | STATS count(*)')).toBe(
      'Command "STATS" is not allowed in a source query: only WHERE may follow FROM or TS'
    );
  });

  it('returns the one-type error message', () => {
    expect(validateSourceEsql('FROM logs-*, traces-*')).toBe(
      'A source query mixes logs (logs-*) and traces (traces-*). A source query must target one kind of data.'
    );
  });
});
