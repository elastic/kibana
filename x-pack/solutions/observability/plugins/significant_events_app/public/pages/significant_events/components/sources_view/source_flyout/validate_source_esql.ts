/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSourceType,
  validateSourceQuery,
  type SourceTypePatterns,
} from '@kbn/nightshift-shared';

/**
 * Form rule for a source query. Structural errors come back immediately. The type check runs
 * only when the pattern lookup succeeded; a failed lookup returns `true` and the server's 400
 * is shown on the query row after save.
 */
export const validateSourceEsql = async ({
  esql,
  getSourceTypePatterns,
}: {
  esql: string;
  getSourceTypePatterns: () => Promise<SourceTypePatterns | null>;
}): Promise<string | true> => {
  const structuralError = validateSourceQuery(esql);
  if (structuralError) {
    return structuralError;
  }

  const patterns = await getSourceTypePatterns();
  if (!patterns) {
    return true;
  }

  const analysis = getSourceType({ esql, patterns });
  return 'error' in analysis ? analysis.error : true;
};
