/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Parser, Walker, isLiteral, isParamLiteral } from '@elastic/esql';
import { InventoryDefinitionError } from './errors';

const SYNTAX_ERROR_PREFIX = 'SyntaxError: ';

const NON_BOOLEAN_LITERAL_TYPES: ReadonlySet<string> = new Set([
  'integer',
  'double',
  'keyword',
  'date_period',
  'time_duration',
]);

type ExpressionRoot = ReturnType<typeof Parser.parseExpression>['root'];

// Keep the author's parentheses: re-deriving them from precedence can change meaning.
const parseExpression = (source: string): ExpressionRoot => {
  const { root, errors } = Parser.parseExpression(source, { withParens: true });
  if (errors.length > 0) {
    throw new Error(errors[0].message);
  }
  return root;
};

// `parseExpression` only says "Invalid command: EVAL …" on a syntax error, so the reason comes
// from parsing the filter inside a throwaway query when that query has one.
const describeParseFailure = (source: string, error: unknown): string => {
  const syntaxError = Parser.parse(`FROM x | WHERE ${source}`).errors.find(({ message }) =>
    message.startsWith(SYNTAX_ERROR_PREFIX)
  );
  if (syntaxError) {
    return syntaxError.message;
  }
  return error instanceof Error ? error.message : String(error);
};

const reprintsUnchanged = (printed: string): boolean => {
  try {
    return BasicPrettyPrinter.expression(parseExpression(printed)) === printed;
  } catch {
    return false;
  }
};

/**
 * Parses an author-written filter as exactly one boolean ES|QL expression and returns it re-printed
 * from its syntax tree; only that canonical text is ever placed in a query.
 *
 * @throws InventoryDefinitionError naming `label` when the filter is not acceptable
 */
export const canonicalizeEsqlFilter = (filter: string, label: string = 'source filter'): string => {
  let root: ExpressionRoot;
  try {
    root = parseExpression(filter);
  } catch (error) {
    const reason = describeParseFailure(filter, error);
    throw new InventoryDefinitionError(
      `${label} must be a single ES|QL expression: ${reason}: ${filter}`
    );
  }

  if (Walker.find(root, (node) => isParamLiteral(node))) {
    throw new InventoryDefinitionError(`${label} must not contain query parameters: ${filter}`);
  }

  if (isLiteral(root) && NON_BOOLEAN_LITERAL_TYPES.has(root.literalType)) {
    throw new InventoryDefinitionError(
      `${label} must be a boolean expression, not a ${root.literalType} literal: ${filter}`
    );
  }

  const printed = BasicPrettyPrinter.expression(root);
  if (!reprintsUnchanged(printed)) {
    throw new InventoryDefinitionError(
      `${label} must re-print unchanged from its syntax tree; rewrite it: ${filter}`
    );
  }

  return printed;
};
