/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface EsqlTable {
  columns: Array<{ name: string }>;
  values: unknown[][];
}

/** Turns an ES|QL `columns` + `values` response into one record per row, keyed by column name. */
export function esqlResultToRows({ columns, values }: EsqlTable): Array<Record<string, unknown>> {
  return values.map((row) =>
    Object.fromEntries(columns.map(({ name }, index) => [name, row[index]]))
  );
}
