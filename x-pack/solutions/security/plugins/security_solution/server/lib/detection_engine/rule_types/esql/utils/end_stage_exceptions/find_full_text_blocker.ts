/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, Walker } from '@elastic/esql';

/**
 * Commands after which ES|QL accepts a full-text function on a column that aliases a field, checked on
 * Elasticsearch 9.6. Any other command may precede a position where Elasticsearch rejects it: after `LIMIT` it
 * always does, and after `STATS` it depends on the order of the commands that follow (`BY key | RENAME` works,
 * `BY key | EVAL alias` does not), so those cannot be decided from the text of the query.
 */
const COMMANDS_THAT_ACCEPT_FULL_TEXT: ReadonlySet<string> = new Set([
  'from',
  'eval',
  'rename',
  'keep',
  'drop',
  'where',
  'sort',
  'dissect',
  'grok',
  'mv_expand',
]);

/**
 * The first command of the query after which a full-text function at the end of the query is not safe, or
 * `undefined` when every command is one that accepts it. Nested commands (sub-queries, `FORK` branches) count.
 */
export const findFullTextBlocker = (query: string): string | undefined => {
  const { root, errors } = Parser.parse(query);
  if (errors.length > 0) {
    return 'a part of the query that could not be parsed';
  }
  const blockers: string[] = [];
  Walker.walk(root, {
    visitCommand: ({ name }) => {
      if (!COMMANDS_THAT_ACCEPT_FULL_TEXT.has(name)) {
        blockers.push(name);
      }
    },
  });
  return blockers[0];
};
