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
 * Generates an ES|QL EVAL assignments fragment for a target entity EUID.
 *
 * Builds the actor fragment via {@link getEuidEsqlEvaluation}, then rewrites every identity
 * source field name to its target-namespace equivalent (e.g. `user.email` → `user.target.email`)
 * so the `_present` booleans and CONCAT expressions reference the target fields.
 *
 * Returns a comma-separated EVAL assignments fragment — wrap with `| EVAL`:
 * ```ts
 * parts.push(`| EVAL ${getTargetEuidEsqlEvaluation(type, outputColumn)}`);
 * ```
 */
export const getTargetEuidEsqlEvaluation = (
  entityType: EntityType,
  outputColumn: string
): string => {
  const fragment = getEuidEsqlEvaluation(entityType, outputColumn);
  const { identitySourceFields } = getEuidSourceFields(entityType);

  // Sort by length descending to prevent partial matches
  // (e.g., `host.hostname` must be replaced before `host.name`)
  const sortedFields = [...identitySourceFields].sort((a, b) => b.length - a.length);

  let out = fragment;
  for (const field of sortedFields) {
    out = out.replaceAll(field, toTargetField(field));
  }

  return out;
};

/**
 * Returns the list of target EUID source fields for the given entity type.
 */
export const getTargetEuidSourceFields = (entityType: EntityType): string[] => {
  const { identitySourceFields } = getEuidSourceFields(entityType);
  return identitySourceFields.map(toTargetField);
};
