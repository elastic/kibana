/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstItem, ESQLAstQueryExpression } from '@elastic/esql/types';
import { BasicPrettyPrinter, Builder, Parser, isColumn, mutate } from '@elastic/esql';

/** Columns the execute path needs on every row to attribute a hit to a source document. */
const METADATA_FIELDS = ['_id', '_index'] as const;

/** Commands whose output rows no longer carry source-document METADATA columns. */
const AGGREGATING_COMMANDS = new Set(['stats', 'inlinestats', 'inline stats']);

const hasWildcardOrMetadataColumn = (args: readonly ESQLAstItem[]): boolean =>
  args.some(
    (arg) =>
      isColumn(arg) &&
      (arg.name.includes('*') || (METADATA_FIELDS as readonly string[]).includes(arg.name))
  );

/**
 * Appends `_id, _index` to every KEEP that precedes the first aggregating
 * command and would otherwise drop them. A KEEP after STATS names aggregate
 * output columns, where the METADATA columns no longer exist.
 *
 * Stops early at a DROP that names a METADATA column or uses a wildcard, since
 * the column is gone (or may be) from that point on.
 */
const addMetadataToKeepCommands = (root: ESQLAstQueryExpression): void => {
  for (const cmd of root.commands) {
    if (AGGREGATING_COMMANDS.has(cmd.name)) break;
    if (cmd.name === 'drop' && hasWildcardOrMetadataColumn(cmd.args)) break;
    if (cmd.name !== 'keep') continue;

    if (cmd.args.some((arg) => isColumn(arg) && arg.name === '*')) continue;
    for (const field of METADATA_FIELDS) {
      if (!cmd.args.some((arg) => isColumn(arg) && arg.name === field)) {
        cmd.args.push(Builder.expression.column(field));
      }
    }
  }
};

/**
 * Upserts `METADATA _id, _index` onto the FROM command and carries those
 * columns through any KEEP that would drop them, via the ES|QL AST rather than
 * string surgery, so pipes inside string literals and multiple KEEPs are safe.
 *
 * Queries that fail to parse, or that do not start with FROM, are returned
 * unchanged so Elasticsearch reports the error against the exact query.
 *
 * The row LIMIT is not applied here: `executeEsql` binds it at execute time.
 */
export const prepareEsqlForExecute = (query: string): string => {
  const { root, errors } = Parser.parse(query);
  if (errors.length > 0 || root.commands[0]?.name !== 'from') {
    return query;
  }

  for (const field of METADATA_FIELDS) {
    mutate.commands.from.metadata.upsert(root, field);
  }
  addMetadataToKeepCommands(root);

  return BasicPrettyPrinter.multiline(root, { pipeTab: '' });
};
