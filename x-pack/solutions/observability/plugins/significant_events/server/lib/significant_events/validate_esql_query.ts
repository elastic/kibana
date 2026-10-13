/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, Walker } from '@elastic/esql';
import type { ESQLAstQueryExpression } from '@elastic/esql/types';
import { StatusError } from '../errors/status_error';

export class EsqlQueryValidationError extends StatusError {
  constructor(message: string, data?: unknown) {
    super(message, 400);
    this.data = data;
  }
}

/** Requires the query's FROM index sources to be exactly the Nightshift source view. */
export function validateEsqlQueryForSourceOrThrow({
  esqlQuery,
  viewName,
}: {
  esqlQuery: string;
  viewName: string;
}): void {
  const sourcesPattern = readFromSources(esqlQuery);
  if (sourcesPattern !== viewName) {
    throw new EsqlQueryValidationError(`ES|QL query must use FROM ${viewName}`);
  }
}

function readFromSources(esqlQuery: string): string {
  let root: ESQLAstQueryExpression;
  let parseErrors: ReturnType<typeof Parser.parse>['errors'];

  try {
    ({ root, errors: parseErrors } = Parser.parse(esqlQuery));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new EsqlQueryValidationError(`Invalid ES|QL query: ${message}`);
  }

  if (parseErrors.length > 0) {
    throw new EsqlQueryValidationError(
      `Invalid ES|QL query: ${parseErrors.map((error) => error.message).join('; ')}`
    );
  }

  const fromCmd = Walker.match(root, { type: 'command', name: 'from' });
  if (!fromCmd) {
    throw new EsqlQueryValidationError('ES|QL query must contain a FROM clause');
  }

  return Walker.matchAll(fromCmd, { type: 'source', sourceType: 'index' })
    .map((node) => node.name)
    .join(', ');
}
