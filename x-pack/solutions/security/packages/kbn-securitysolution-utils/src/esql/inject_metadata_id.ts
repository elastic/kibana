/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstQueryExpression, ESQLAstItem, ESQLFunction } from '@elastic/esql/types';
import {
  Parser,
  Builder,
  BasicPrettyPrinter,
  mutate,
  isColumn,
  isFunctionExpression,
} from '@elastic/esql';

/**
 * Injects `METADATA _id` into the FROM command of an ES|QL query and performs
 * best-effort fixups so `_id` survives through the pipeline.
 *
 * The caller is responsible for skipping aggregating queries — this function
 * transforms unconditionally.
 *
 * **What it does:**
 * 1. Upserts `METADATA _id` into FROM (no-op if already present).
 * 2. Appends `_id` to any KEEP command that would otherwise exclude it
 *    (including KEEP with wildcards — redundant but harmless).
 *
 * **When KEEP injection stops (conservatively):**
 * - `DROP _id` / `DROP _*` / any wildcard DROP — column removed
 * - `RENAME _id AS …` — column exists under a new name
 * - `EVAL _id = …` — metadata value overwritten
 * - `DISSECT` / `GROK` — may create columns unpredictably
 *
 * **Examples:**
 * ```
 * "FROM logs*"                          → "FROM logs* METADATA _id"
 * "FROM logs* METADATA _index"          → "FROM logs* METADATA _index, _id"
 * "FROM logs* | KEEP host"              → "FROM logs* METADATA _id | KEEP host, _id"
 * "FROM logs* | KEEP host, _id"         → "FROM logs* METADATA _id | KEEP host, _id"  (no-op)
 * "FROM logs* METADATA _id"             → "FROM logs* METADATA _id"                    (no-op)
 * "FROM logs* | DROP _id | KEEP host"   → "FROM logs* METADATA _id | DROP _id | KEEP host"
 * "FROM logs* | KEEP agent.*"           → "FROM logs* METADATA _id | KEEP agent.*, _id"
 * "FROM logs* | DISSECT msg … | KEEP x" → "FROM logs* METADATA _id | DISSECT msg … | KEEP x"
 * ```
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
 * Walks the pipeline and appends `_id` to KEEP commands that don't already
 * include it (exact match only — wildcards like `*` or `_*` still get `_id`
 * appended, which is redundant but harmless).
 *
 * Stops at the first command where `_id` may no longer be the original
 * metadata value: DROP _id / wildcard DROP, RENAME _id, EVAL _id, DISSECT, GROK.
 *
 * Returns early without iterating if no KEEP command exists in the pipeline.
 */
function addIdToKeepCommands(root: ESQLAstQueryExpression): void {
  if (!root.commands.some((cmd) => cmd.name === 'keep')) {
    return;
  }

  for (const cmd of root.commands) {
    if (cmd.name === 'drop' && hasColumnMatchingId(cmd.args)) {
      break;
    }

    if (cmd.name === 'rename' && hasRenameOfId(cmd.args)) {
      break;
    }

    if (cmd.name === 'eval' && hasAssignmentToId(cmd.args)) {
      break;
    }

    if (cmd.name === 'dissect' || cmd.name === 'grok') {
      break;
    }

    if (cmd.name === 'keep') {
      if (!cmd.args.some((arg) => isColumn(arg) && arg.name === '_id')) {
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

/**
 * Returns `true` when any column arg is `_id` or contains a wildcard (e.g. `_*`, `*`).
 * Wildcards could match `_id`, so we conservatively stop injection.
 */
function hasColumnMatchingId(args: readonly ESQLAstItem[]): boolean {
  return args.some((arg) => isColumn(arg) && (arg.name === '_id' || arg.name.includes('*')));
}
