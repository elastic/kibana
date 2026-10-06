/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSourceType, validateSourceQuery } from '@kbn/nightshift-shared';

/** Form rule for a source query. Structural errors come back before the one-type check. */
export const validateSourceEsql = (esql: string): string | true => {
  const structuralError = validateSourceQuery(esql);
  if (structuralError) {
    return structuralError;
  }

  const analysis = getSourceType({ esql });
  return 'error' in analysis ? analysis.error : true;
};
