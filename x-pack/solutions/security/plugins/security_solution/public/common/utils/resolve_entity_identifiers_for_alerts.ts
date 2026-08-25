/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Normalizes identityFields or legacy entityFilter into a single Record for alerts queries and UI.
 * Prefers identityFields when both are provided.
 */
export const resolveEntityIdentifiers = (
  identityFields?: Record<string, string> | null,
  entityFilter?: { field: string; value: string | string[] } | null
): Record<string, string> | undefined => {
  if (identityFields != null && Object.keys(identityFields).length > 0) {
    return identityFields;
  }
  if (entityFilter != null) {
    const value =
      typeof entityFilter.value === 'string'
        ? entityFilter.value
        : Array.isArray(entityFilter.value)
        ? entityFilter.value[0]
        : '';
    return { [entityFilter.field]: String(value) };
  }
  return undefined;
};
