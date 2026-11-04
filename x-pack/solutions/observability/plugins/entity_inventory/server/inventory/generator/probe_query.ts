/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertSafeIndexPattern, quoteIdentifier } from './esql_syntax';
import { assertParses } from './parse_guard';
import type { GeneratedQuery } from './types';

/**
 * Builds the probe that decides whether a source gets a `TS` plan; the executor reads the type of
 * its `@timestamp` column.
 */
export const buildProbeQuery = (indexPattern: string): GeneratedQuery => {
  assertSafeIndexPattern(indexPattern);
  const esql = [
    'SET unmapped_fields="nullify";',
    `TS ${indexPattern}`,
    `| KEEP ${quoteIdentifier('@timestamp')}`,
    '| LIMIT 0',
  ].join('\n');

  assertParses(esql);
  return { esql, params: [] };
};
