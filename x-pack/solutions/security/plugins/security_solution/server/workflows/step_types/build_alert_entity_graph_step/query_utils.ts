/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const buildEntityShouldClauses = (params: {
  entitiesByField: Map<string, Set<string>>;
  maxTermsPerQuery: number;
}): Array<Record<string, unknown>> => {
  const { entitiesByField, maxTermsPerQuery } = params;
  const shouldClauses: Array<Record<string, unknown>> = [];

  for (const [field, valuesSet] of entitiesByField.entries()) {
    const values = Array.from(valuesSet);
    if (values.length > 0) {
      for (let i = 0; i < values.length; i += maxTermsPerQuery) {
        const chunk = values.slice(i, i + maxTermsPerQuery);
        shouldClauses.push({
          terms: {
            [field]: chunk,
          },
        });
      }
    }
  }

  return shouldClauses;
};
