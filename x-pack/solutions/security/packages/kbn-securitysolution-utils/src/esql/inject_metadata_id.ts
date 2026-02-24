/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstQueryExpression } from '@kbn/esql-language';
import { Parser, Builder, BasicPrettyPrinter, mutate, isColumn } from '@kbn/esql-language';
import { isAggregatingQuery } from './compute_if_esql_query_aggregating';

/**
 * Ensures that a non-aggregating ES|QL query has `METADATA _id` in the FROM command
 * and that any downstream KEEP command also includes `_id`.
 *
 * Aggregating queries (those with STATS...BY) are returned unchanged.
 *
 * DROP _id is intentionally left untouched — removing a user's explicit DROP
 * would be surprising. This remains an accepted limitation.
 */
export const injectMetadataId = (query: string): string => {
  const { root } = Parser.parse(query);

  if (isAggregatingQuery(root)) {
    return query;
  }

  // Upsert METADATA _id into the FROM command: creates the METADATA clause if
  // absent, appends _id if the clause exists without it, no-ops if _id is
  // already present.
  mutate.commands.from.metadata.upsert(root, '_id');

  // Best-effort: add _id to KEEP commands that would otherwise drop it.
  addIdToKeepCommands(root);

  return BasicPrettyPrinter.print(root);
};

/**
 * Walks the pipeline in order and appends `_id` to KEEP commands that don't
 * already include it (or a `*` wildcard). Stops injecting once a `DROP _id`
 * is encountered, since `_id` is no longer available downstream.
 */
function addIdToKeepCommands(root: ESQLAstQueryExpression): void {
  for (const cmd of root.commands) {
    if (cmd.name === 'drop' && cmd.args.some((arg) => isColumn(arg) && arg.name === '_id')) {
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
