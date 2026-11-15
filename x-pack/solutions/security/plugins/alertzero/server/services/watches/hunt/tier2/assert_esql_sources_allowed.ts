/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, Walker } from '@elastic/esql';
import { isIndexPatternAllowed } from '../common/matches_required';

export type AssertEsqlSourcesAllowedResult = { ok: true } | { ok: false; reason: string };

/**
 * Fail-closed gate for Tier 2 execute: every index a query reads must sit inside
 * the hunt's allowed patterns. The post-execute `_index` hit bar is not an
 * execute-time boundary; this check is.
 *
 * `FROM` is not the only command that reads data — `LOOKUP JOIN` and `ENRICH`
 * name a target too, so a query opening with an allowed `FROM` could still reach
 * outside the scope. Every command is checked instead of the `FROM` list alone,
 * and because each one names its target as a `source` node, a command ES|QL adds
 * later is covered by default rather than silently exempt. An `ENRICH` policy is
 * refused on the same grounds: it resolves to an index this hunt never allowed.
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

  const sourcesOf = (node: Parameters<typeof Walker.walk>[0]): string[] => {
    const names: string[] = [];
    Walker.walk(node, { visitSource: ({ name }) => names.push(name) });
    return names;
  };

  if (sourcesOf(root.commands[0]).length === 0) {
    return { ok: false, reason: 'FROM has no sources' };
  }

  for (const command of root.commands) {
    for (const source of sourcesOf(command)) {
      if (!isIndexPatternAllowed(source, allowedPatterns)) {
        return {
          ok: false,
          reason: `${command.name.toUpperCase()} source "${source}" is outside the hunt index scope`,
        };
      }
    }
  }

  return { ok: true };
};
