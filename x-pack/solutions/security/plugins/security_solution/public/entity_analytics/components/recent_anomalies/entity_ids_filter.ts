/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Escapes a value for use inside a double-quoted ES|QL string literal. */
const escapeEsqlString = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/**
 * Builds an ES|QL `WHERE entity_id IN (...)` fragment that constrains anomaly
 * records to a pre-resolved set of entity IDs (EUIDs). The IDs are resolved
 * from the entity store using the global search bar filter, because the ML
 * anomalies index does not contain the entity.* fields the search bar targets.
 *
 * Must be applied after `entity_id` has been computed. Returns an empty string
 * when `entityIds` is `undefined` (no active filter) so the query is left
 * unconstrained. The empty-array case (filter active but nothing matched) is
 * handled by the calling hook, which short-circuits before building the query.
 */
export const getEntityIdsFilter = (entityIds: string[] | undefined): string => {
  if (!entityIds || entityIds.length === 0) {
    return '';
  }
  const list = entityIds.map((id) => `"${escapeEsqlString(id)}"`).join(', ');
  return `| WHERE entity_id IN (${list}) `;
};
