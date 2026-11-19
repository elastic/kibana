/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, Walker } from '@elastic/esql';

export const MAX_GENERATED_ESQL_LENGTH = 2000;

/** Commands that read and reshape the one source; anything that reaches elsewhere is left out. */
const ALLOWED_COMMANDS: ReadonlySet<string> = new Set([
  'from',
  'where',
  'eval',
  'stats',
  'inline stats',
  'sort',
  'limit',
  'keep',
  'drop',
  'rename',
  'mv_expand',
]);

/** The dashboard time range, which only panel queries may read. */
export const TIME_RANGE_PARAMS: readonly string[] = ['_tstart', '_tend'];

export type EsqlGuardResult =
  | {
      ok: true;
      /** Where the `FROM` command ends, so a filter can be placed right after it. */
      fromEnd: number;
      usesTimeRangeParams: boolean;
    }
  | { ok: false; reason: string };

const refuse = (reason: string): EsqlGuardResult => ({ ok: false, reason });

/**
 * Whether a query a model wrote only reads the one source it was asked about, with commands from
 * the allow-list. The query is parsed, so a source or command hidden in a subquery is found too.
 */
export const checkGeneratedEsql = (
  query: string,
  source: string,
  { allowTimeRangeParams }: { allowTimeRangeParams: boolean }
): EsqlGuardResult => {
  if (query.length > MAX_GENERATED_ESQL_LENGTH) {
    return refuse(`The query is longer than ${MAX_GENERATED_ESQL_LENGTH} characters.`);
  }

  const { root, errors } = Parser.parse(query);
  if (errors.length > 0) {
    return refuse(`Syntax error: ${errors[0].message}`);
  }

  const [firstCommand] = root.commands;
  if (firstCommand === undefined || firstCommand.name !== 'from') {
    return refuse(`The query must start with FROM ${source}.`);
  }

  const commandNames: string[] = [];
  const sources: Array<{ name: string; sourceType: string; hasCluster: boolean }> = [];
  Walker.walk(root, {
    visitCommand: ({ name }) => {
      commandNames.push(name);
    },
    visitSource: ({ name, sourceType, prefix }) => {
      sources.push({ name, sourceType, hasCluster: prefix !== undefined });
    },
  });

  const disallowedCommand = commandNames.find((name) => !ALLOWED_COMMANDS.has(name));
  if (disallowedCommand !== undefined) {
    return refuse(`The ${disallowedCommand.toUpperCase()} command is not allowed.`);
  }
  if (commandNames.filter((name) => name === 'from').length !== 1) {
    return refuse('Subqueries are not allowed.');
  }
  if (
    sources.length !== 1 ||
    sources[0].sourceType !== 'index' ||
    sources[0].hasCluster ||
    sources[0].name !== source
  ) {
    return refuse(`The query must read from ${source} and from nothing else.`);
  }

  const params = Walker.params(root);
  const unknownParam = params.find(
    ({ paramType, value }) => paramType !== 'named' || !TIME_RANGE_PARAMS.includes(String(value))
  );
  if (unknownParam !== undefined) {
    return refuse('Only the ?_tstart and ?_tend parameters exist.');
  }
  if (params.length > 0 && !allowTimeRangeParams) {
    return refuse('This query must not use ?_tstart or ?_tend.');
  }

  return {
    ok: true,
    fromEnd: firstCommand.location.max + 1,
    usesTimeRangeParams: params.length > 0,
  };
};
