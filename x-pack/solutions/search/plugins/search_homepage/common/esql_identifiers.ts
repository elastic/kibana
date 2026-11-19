/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const UNQUOTED_SOURCE = /^[A-Za-z0-9_][A-Za-z0-9_.*-]*$/;
const UNQUOTED_COLUMN = /^[A-Za-z_@][A-Za-z0-9_]*(\.[A-Za-z_@][A-Za-z0-9_]*)*$/;

/** An index, data stream or pattern as it must be written after `FROM`. */
export const quoteEsqlSource = (name: string): string =>
  UNQUOTED_SOURCE.test(name) ? name : `"${name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** A field name as it must be written where ES|QL expects a column. */
export const quoteEsqlColumn = (name: string): string =>
  UNQUOTED_COLUMN.test(name) ? name : `\`${name.replace(/`/g, '``')}\``;
