/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '@kbn/entity-store/common';
import { getEuidEsqlEvaluation, getEuidSourceFields } from '@kbn/entity-store/common/domain/euid';

/**
 * Inserts `.target` after the first path segment (entity type namespace).
 * e.g. `user.email` → `user.target.email`, `host.id` → `host.target.id`
 */
export const toTargetField = (field: string): string => {
  const parts = field.split('.');
  if (parts.length < 2) return field;
  return `${parts[0]}.target.${parts.slice(1).join('.')}`;
};

/**
 * Generates ESQL evaluation for a target entity EUID.
 *
 * Workaround: transforms the actor ESQL by replacing identity source field names
 * with their target-namespace equivalents (e.g., `user.email` → `user.target.email`).
 * Computed intermediate fields like `entity.namespace` are preserved since they are
 * excluded from `getEuidSourceFields`.
 *
 * This is temporary until Entity Store provides a proper target EUID API.
 */
export const getTargetEuidEsqlEvaluation = (entityType: EntityType): string => {
  const actorEsql = getEuidEsqlEvaluation(entityType);
  const { identitySourceFields } = getEuidSourceFields(entityType);

  // Sort by length descending to prevent partial matches
  // (e.g., `host.hostname` must be replaced before `host.name`)
  const sortedFields = [...identitySourceFields].sort((a, b) => b.length - a.length);

  let targetEsql = actorEsql;
  for (const field of sortedFields) {
    targetEsql = targetEsql.replaceAll(field, toTargetField(field));
  }

  return targetEsql;
};

/**
 * Returns the list of target EUID source fields for the given entity type.
 */
export const getTargetEuidSourceFields = (entityType: EntityType): string[] => {
  const { identitySourceFields } = getEuidSourceFields(entityType);
  return identitySourceFields.map(toTargetField);
};
