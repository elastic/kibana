/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryPlan } from './types';

/** @throws RangeError naming `label` when `limit` is not a positive integer */
export const assertValidLimit = (limit: number, label: string): void => {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new RangeError(`${label} limit must be a positive integer, got ${limit}`);
  }
};

/** The command that reads a plan's source under its engine. */
export const sourceCommandOf = ({ engine, indexPattern }: QueryPlan): string =>
  engine === 'TS' ? `TS ${indexPattern}` : `FROM ${indexPattern} METADATA _index_mode`;
