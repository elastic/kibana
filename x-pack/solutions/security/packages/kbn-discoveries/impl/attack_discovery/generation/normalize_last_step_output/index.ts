/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Placeholder — real implementation added in PR 4

interface EsqlColumn {
  name: string;
  type: string;
}

interface EsqlShape {
  columns: EsqlColumn[];
  values: unknown[][];
}

export const isEsqlShape = (output: unknown): output is EsqlShape => {
  if (output == null || typeof output !== 'object' || Array.isArray(output)) {
    return false;
  }
  const o = output as Record<string, unknown>;
  return Array.isArray(o.columns) && Array.isArray(o.values);
};
