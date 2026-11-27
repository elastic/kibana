/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';

/**
 * Whether `esql` is a real, runnable ES|QL query rather than a placeholder a
 * model left behind (a comment describing the intended query with nothing
 * executable after it). True iff the query parses with no errors and its
 * first command is `FROM` (any case): a `FROM`-less query, or one that only
 * mentions `FROM` inside a comment, has no commands to run.
 */
export const isExecutableHuntQuery = (esql: string): boolean => {
  try {
    const { root, errors } = Parser.parse(esql);
    if (errors.length > 0) return false;
    return root.commands[0]?.name === 'from';
  } catch {
    return false;
  }
};
