/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourceTypePatterns } from '@kbn/nightshift-shared';
import { validateSourceEsql } from './validate_source_esql';

const patterns = (value: SourceTypePatterns | null) => jest.fn().mockResolvedValue(value);

describe('validateSourceEsql', () => {
  it('returns the structural error without reading patterns', async () => {
    const getSourceTypePatterns = patterns({ logs: [], traces: [] });

    await expect(
      validateSourceEsql({ esql: 'FROM logs-* | STATS count(*)', getSourceTypePatterns })
    ).resolves.toMatch(/STATS/);
    expect(getSourceTypePatterns).not.toHaveBeenCalled();
  });

  it('accepts a query whose indices are one type', async () => {
    await expect(
      validateSourceEsql({
        esql: 'FROM my-a-*, my-b-*',
        getSourceTypePatterns: patterns({ logs: [], traces: [] }),
      })
    ).resolves.toBe(true);
  });

  it('accepts mixed names when a configured log source covers them', async () => {
    await expect(
      validateSourceEsql({
        esql: 'FROM logs-*, my-app-*',
        getSourceTypePatterns: patterns({ logs: ['my-app-*'], traces: [] }),
      })
    ).resolves.toBe(true);
  });

  it('rejects an unscoped wildcard', async () => {
    await expect(
      validateSourceEsql({
        esql: 'FROM *',
        getSourceTypePatterns: patterns({ logs: [], traces: [] }),
      })
    ).resolves.toMatch(/unscoped wildcard/);
  });

  it('rejects a query that mixes types', async () => {
    await expect(
      validateSourceEsql({
        esql: 'FROM logs-*, traces-*',
        getSourceTypePatterns: patterns({ logs: [], traces: [] }),
      })
    ).resolves.toMatch(/mixes/);
  });

  it('rejects an index that matches more than one type', async () => {
    await expect(
      validateSourceEsql({
        esql: 'FROM logs-traces-*',
        getSourceTypePatterns: patterns({ logs: [], traces: [] }),
      })
    ).resolves.toMatch(/more than one kind/);
  });

  it('skips the type check when the pattern lookup failed', async () => {
    await expect(
      validateSourceEsql({
        esql: 'FROM logs-*, traces-*',
        getSourceTypePatterns: patterns(null),
      })
    ).resolves.toBe(true);
  });
});
