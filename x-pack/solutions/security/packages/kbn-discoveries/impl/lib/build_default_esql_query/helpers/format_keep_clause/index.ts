/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const PIPE_INDENT = '  ';
const FIELD_INDENT = '      ';

/**
 * Formats a KEEP clause with each field on its own line, matching the
 * indentation style produced by the ES|QL editor's "Prettify query" feature:
 *
 * ```
 *   | KEEP
 *       _id,
 *       @timestamp,
 *       host.name,
 *       user.name
 * ```
 */
export const formatKeepClause = (fields: readonly string[]): string => {
  if (fields.length === 0) {
    return `${PIPE_INDENT}| KEEP`;
  }

  const formattedFields = fields
    .map((field, i) => `${FIELD_INDENT}${field}${i < fields.length - 1 ? ',' : ''}`)
    .join('\n');

  return `${PIPE_INDENT}| KEEP\n${formattedFields}`;
};
