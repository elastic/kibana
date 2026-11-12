/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphTraversalExclusion } from '@kbn/entity-store/common';

/** Node ids in the traversal are entity ids, so excluding a node is an exclusion on this field. */
export const NODE_ID_EXCLUSION_FIELD = 'entity.id';

/** Returns the list with `value` added under `field`, merging into an existing entry. */
export const addExclusion = (
  exclusions: GraphTraversalExclusion[],
  field: string,
  value: string
): GraphTraversalExclusion[] => {
  const existing = exclusions.find((exclusion) => exclusion.field === field);
  if (!existing) {
    return [...exclusions, { field, values: [value] }];
  }
  if (existing.values.includes(value)) {
    return exclusions;
  }
  return exclusions.map((exclusion) =>
    exclusion === existing ? { field, values: [...exclusion.values, value] } : exclusion
  );
};

/** Returns the list without `value` under `field`, dropping the entry when it becomes empty. */
export const removeExclusion = (
  exclusions: GraphTraversalExclusion[],
  field: string,
  value: string
): GraphTraversalExclusion[] =>
  exclusions.flatMap((exclusion) => {
    if (exclusion.field !== field) return [exclusion];
    const values = exclusion.values.filter((candidate) => candidate !== value);
    return values.length > 0 ? [{ field, values }] : [];
  });
