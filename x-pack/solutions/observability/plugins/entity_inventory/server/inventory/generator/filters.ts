/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, Walker, isLiteral, isParamLiteral } from '@elastic/esql';
import { InventoryDefinitionError } from './errors';

const FORBIDDEN_FRAGMENTS: ReadonlyArray<{ readonly fragment: string; readonly reason: string }> = [
  { fragment: '|', reason: 'a pipe' },
  { fragment: ';', reason: 'a semicolon' },
  { fragment: '//', reason: 'a line comment' },
  { fragment: '/*', reason: 'a block comment' },
  { fragment: '*/', reason: 'a block comment' },
];

const NON_BOOLEAN_LITERAL_TYPES: ReadonlySet<string> = new Set([
  'integer',
  'double',
  'keyword',
  'date_period',
  'time_duration',
]);

/**
 * Returns why an author-written filter cannot be placed in a `WHERE`, or `undefined` when it is a
 * single ES|QL expression that parses as exactly `FROM x | WHERE <filter>`.
 */
export const validateEsqlFilter = (
  filter: string,
  label: string = 'source filter'
): string | undefined => {
  const forbidden = FORBIDDEN_FRAGMENTS.find(({ fragment }) => filter.includes(fragment));
  if (forbidden) {
    return `${label} must not contain ${forbidden.reason}: ${filter}`;
  }

  const { root, errors } = Parser.parse(`FROM x | WHERE ${filter}`);
  if (errors.length > 0) {
    return `${label} does not parse: ${errors[0].message}: ${filter}`;
  }

  const [, where] = root.commands;
  if (root.commands.length !== 2 || where?.name !== 'where' || where.args.length !== 1) {
    return `${label} must be a single boolean expression: ${filter}`;
  }

  const [expression] = where.args;
  if (isLiteral(expression) && NON_BOOLEAN_LITERAL_TYPES.has(expression.literalType)) {
    return `${label} must be a boolean expression, not a ${expression.literalType} literal: ${filter}`;
  }

  if (Walker.find(where, (node) => isParamLiteral(node))) {
    return `${label} must not contain query parameters: ${filter}`;
  }

  return undefined;
};

/** Throws an {@link InventoryDefinitionError} when a filter fails {@link validateEsqlFilter}. */
export const assertEsqlFilter = (filter: string, label: string = 'source filter'): void => {
  const problem = validateEsqlFilter(filter, label);
  if (problem !== undefined) {
    throw new InventoryDefinitionError(problem);
  }
};
