/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstQueryExpression, ESQLCommand } from '@kbn/esql-language';
import { parse, isColumn, isOptionNode } from '@kbn/esql-language';
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
  const { root } = parse(query);

  if (isAggregatingQuery(root)) {
    return query;
  }

  let result = query;

  const hasMetadata = hasMetadataOption(root);
  const hasId = hasMetadataIdField(root);

  if (!hasMetadata) {
    result = insertMetadataIdIntoFrom(result);
  } else if (!hasId) {
    result = appendIdToExistingMetadata(result);
  }

  result = ensureKeepIncludesId(result);

  return result;
};

function hasMetadataOption(root: ESQLAstQueryExpression): boolean {
  const fromCommand = root.commands.find((cmd) => cmd.name === 'from');
  if (!fromCommand) {
    return false;
  }
  return fromCommand.args.some((arg) => isOptionNode(arg) && arg.name === 'metadata');
}

function hasMetadataIdField(root: ESQLAstQueryExpression): boolean {
  const fromCommand = root.commands.find((cmd) => cmd.name === 'from');
  if (!fromCommand) {
    return false;
  }

  for (const arg of fromCommand.args) {
    if (isOptionNode(arg) && arg.name === 'metadata') {
      return arg.args.some((metaArg) => isColumn(metaArg) && metaArg.name === '_id');
    }
  }

  return false;
}

/**
 * Inserts `METADATA _id` into a FROM command that has no METADATA clause.
 * Places it before the first pipe `|` or at the end of the query.
 */
function insertMetadataIdIntoFrom(query: string): string {
  const pipeIndex = query.indexOf('|');

  if (pipeIndex === -1) {
    return query.trimEnd() + ' METADATA _id';
  }

  const beforePipe = query.slice(0, pipeIndex);
  const afterPipe = query.slice(pipeIndex);
  const trimmed = beforePipe.trimEnd();
  const whitespace = beforePipe.slice(trimmed.length) || ' ';

  return trimmed + ' METADATA _id' + whitespace + afterPipe;
}

/**
 * Appends `_id` to an existing METADATA clause that is missing it.
 */
function appendIdToExistingMetadata(query: string): string {
  return query.replace(
    /\bmetadata\s+[\w_]+(?:\s*,\s*[\w_]+)*/i,
    (match) => match + ', _id'
  );
}

/**
 * For every KEEP command in the query that doesn't already include `_id`,
 * appends `, _id` to its column list.
 */
function ensureKeepIncludesId(query: string): string {
  const { root } = parse(query);
  const keepCommands = root.commands.filter(
    (cmd): cmd is ESQLCommand => cmd.name === 'keep'
  );

  if (keepCommands.length === 0) {
    return query;
  }

  const needsId = keepCommands.some(
    (cmd) => !cmd.args.some((arg) => isColumn(arg) && arg.name === '_id')
  );

  if (!needsId) {
    return query;
  }

  return query.replace(
    /\bkeep\s+[\w_.*`]+(?:\s*,\s*[\w_.*`]+)*/gi,
    (match) => {
      if (/\b_id\b/.test(match)) {
        return match;
      }
      return match + ', _id';
    }
  );
}
