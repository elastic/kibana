/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryArgs, Row, RunContext } from './common';
import { ENRICH_FNS } from './columns/registry';

/** Runs all page enrichers on a shallow copy of `rows` (enrichers mutate in place). */
export const enrichEntityRows = async (
  rows: Row[],
  args: QueryArgs,
  skip: Set<string>,
  ctx: RunContext
): Promise<Row[]> => {
  const copy = rows.map((row) => ({ ...row }));
  await Promise.all(ENRICH_FNS.map((fn) => fn(copy, args, skip, ctx)));
  return copy;
};
