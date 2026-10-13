/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESOLVED_TO_FIELD, getEntityIds } from '../common';
import type { QueryArgs, Row } from '../common';
import {
  ENTITY_TYPE_FILTER,
  ID_LIST_CHUNK_SIZE,
  buildKeepClause,
  getEntityAlias,
  toList,
} from './esql';
import type { EsqlRunner } from './types';

/**
 * The rows with the aliases of the resolved entities among them, for a read of other data to
 * find the rows of the aliases too: they count for their resolved entity. Individual rows are
 * the entities themselves.
 */
export const withEntityAliases = async (
  rows: readonly Row[],
  args: QueryArgs,
  runQuery: EsqlRunner
): Promise<readonly Row[]> => {
  const ids = getEntityIds(rows);
  if (args.rowsMode !== 'resolved' || !ids.length) return rows;
  const aliases = await runQuery(
    [
      `FROM ${getEntityAlias(args.namespace)}`,
      `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IN (${toList(ids)})`,
      buildKeepClause(args),
      `| LIMIT ${ID_LIST_CHUNK_SIZE + 1}`,
    ].join('\n')
  );
  // The ids and identities of the aliases go into the query of the read, which has a size limit.
  if (aliases.length > ID_LIST_CHUNK_SIZE) {
    throw new Error(
      'The resolved entities of this page have too many aliases to read their columns'
    );
  }
  return [...rows, ...aliases];
};
