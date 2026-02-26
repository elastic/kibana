/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstQueryExpression, ESQLAstItem, ESQLFunction } from '@kbn/esql-language';
import {
  Parser,
  Builder,
  BasicPrettyPrinter,
  mutate,
  isColumn,
  isFunctionExpression,
} from '@kbn/esql-language';

/**
 * Ensures that an ES|QL query has `METADATA _id` in the FROM command
 * and that any downstream KEEP command also includes `_id`.
 *
 * The caller is responsible for skipping aggregating queries — this function
 * performs the transformation unconditionally.
 *
 * DROP _id is intentionally left untouched — removing a user's explicit DROP
 * would be surprising. This remains an accepted limitation.
 */
export const injectMetadataId = (query: string): string => {
  const { root } = Parser.parse(query);

  mutate.commands.from.metadata.upsert(root, '_id');

  // Best-effort: add _id to KEEP commands that would otherwise drop it.
  addIdToKeepCommands(root);

  return BasicPrettyPrinter.print(root);
};

/**
 * Walks the pipeline in order and appends `_id` to KEEP commands that don't
 * already include it (or a `*` wildcard). Stops injecting once a command that
 * invalidates the `_id` column is encountered:
 *
 * - `DROP _id`        — removes the column entirely
 * - `RENAME _id AS …` — the column exists under a new name; `_id` is gone
 * - `EVAL _id = …`    — overwrites the metadata value with a computed one
 */
function addIdToKeepCommands(root: ESQLAstQueryExpression): void {
  for (const cmd of root.commands) {
    if (cmd.name === 'drop' && cmd.args.some((arg) => isColumn(arg) && arg.name === '_id')) {
      break;
    }

    if (cmd.name === 'rename' && hasRenameOfId(cmd.args)) {
      break;
    }

    if (cmd.name === 'eval' && hasAssignmentToId(cmd.args)) {
      break;
    }

    if (cmd.name === 'keep') {
      const alreadyHasId = cmd.args.some(
        (arg) => isColumn(arg) && (arg.name === '_id' || arg.name === '*')
      );
      if (!alreadyHasId) {
        cmd.args.push(Builder.expression.column('_id'));
      }
    }
  }
}

/**
 * Type guard that returns `true` when the node is a function expression whose
 * first argument is a column with the given name (e.g. `_id AS alias` or `_id = expr`).
 */
function isTargetingColumn(arg: ESQLAstItem, columnName: string): arg is ESQLFunction {
  return isFunctionExpression(arg) && isColumn(arg.args[0]) && arg.args[0].name === columnName;
}

function hasRenameOfId(args: ESQLAstItem[]): boolean {
  return args.some(
    (arg) => isTargetingColumn(arg, '_id') && (arg.name === 'as' || arg.name === '=')
  );
}

function hasAssignmentToId(args: ESQLAstItem[]): boolean {
  return args.some((arg) => isTargetingColumn(arg, '_id') && arg.name === '=');
}
