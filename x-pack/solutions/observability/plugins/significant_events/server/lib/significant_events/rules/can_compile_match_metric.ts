/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import type { ESQLCommand } from '@elastic/esql/types';

/** A filter-only MATCH: `FROM` plus zero or more `WHERE`. */
const FILTER_ONLY_COMMANDS = new Set(['from', 'where']);

/**
 * Returns true when a stored MATCH KI can be compiled into a count metric-series
 * breach query. Eligible shape: `FROM` plus zero or more `WHERE` — no STATS,
 * SORT, LIMIT, KEEP, EVAL, etc. Unparseable queries are ineligible (fail closed).
 *
 * Generation already forbids SORT/LIMIT/KEEP on MATCH, so unsupported shapes are
 * rejected rather than rewritten. Ineligible queries must fail closed at
 * install/promote — never fall back to copying per-document rows into
 * `.rule-events`.
 */
export function canCompileMatchMetric(esqlQuery: string): boolean {
  const trimmed = esqlQuery.trim();
  if (!trimmed) {
    return false;
  }

  // `Parser.parse` never throws; syntax errors land in `errors`.
  const { root, errors } = Parser.parse(trimmed);
  if (errors.length > 0) {
    return false;
  }

  const names = (root.commands as ESQLCommand[]).map((cmd) =>
    typeof cmd.name === 'string' ? cmd.name.toLowerCase() : ''
  );
  return names[0] === 'from' && names.every((name) => FILTER_ONLY_COMMANDS.has(name));
}
