/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getShouldMatchOrNotExistFilter(
  terms: Record<string, string | undefined> | undefined
) {
  if (!terms) {
    return [];
  }

  return Object.entries(terms)
    .map(([field, value]) => ({ field, value }))
    .filter(({ value }) => value)
    .map(({ field, value }) => {
      return {
        bool: {
          should: [
            { bool: { filter: [{ term: { [field]: value } }] } },
            { bool: { must_not: { bool: { filter: [{ exists: { field } }] } } } },
          ],
          minimum_should_match: 1,
        },
      };
    });
}
