/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlResultRow, EsqlResultColumn } from '../esql_request';

/**
 * transform ES|QL result row to JSON object
 * @param columns
 * @param row
 * @returns Record<string, string | null>
 */
export const rowToDocument = (
  columns: EsqlResultColumn[],
  row: EsqlResultRow
): Record<string, string | null> => {
  return columns.reduce<Record<string, string | null>>((acc, column, i) => {
    // skips nulls, as ES|QL return null for each existing mapping field
    if (row[i] !== null) {
      acc[column.name] = row[i];
    }
    return acc;
  }, {});
};
