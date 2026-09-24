/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, mutate } from '@elastic/esql';
import { isIndexPatternAllowed } from '../common/matches_required';

export type AssertEsqlSourcesAllowedResult = { ok: true } | { ok: false; reason: string };

/**
 * Fail-closed gate for Tier 2 execute: every FROM source must sit inside the
 * hunt's allowed index patterns. The post-execute `_index` hit bar is not an
 * execute-time boundary; this check is.
 *
 * Queries that fail to parse, do not start with FROM, have no sources, or
 * name a source outside the allowlist are refused.
 */
export const assertEsqlSourcesAllowed = (
  query: string,
  allowedPatterns: string[]
): AssertEsqlSourcesAllowedResult => {
  if (allowedPatterns.length === 0) {
    return { ok: false, reason: 'no allowed index patterns' };
  }

  const { root, errors } = Parser.parse(query);
  if (errors.length > 0 || root.commands[0]?.name !== 'from') {
    return { ok: false, reason: 'query must start with a valid FROM' };
  }

  const sources = [...mutate.commands.from.sources.list(root)];
  if (sources.length === 0) {
    return { ok: false, reason: 'FROM has no sources' };
  }

  for (const source of sources) {
    if (!isIndexPatternAllowed(source.name, allowedPatterns)) {
      return {
        ok: false,
        reason: `FROM source "${source.name}" is outside the hunt index scope`,
      };
    }
  }

  return { ok: true };
};
