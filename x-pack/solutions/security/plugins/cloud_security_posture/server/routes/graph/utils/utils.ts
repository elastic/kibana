/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityTypeMappings } from '../entity_type_constants';

/**
 * Returns the icon for an entity type, matched case-insensitively, or `undefined` when the type
 * has no mapping.
 */
export const getEntityTypeIcon = (entityGroupType: string): string | undefined => {
  if (!entityGroupType) {
    return undefined;
  }

  return entityTypeMappings.icons[entityGroupType.toLowerCase()];
};

/**
 * Comparator for sorting connector nodes: relationship nodes first, then event nodes,
 * then alphabetically by label within each group.
 * Accepts objects with at least { kind?: string; label?: string }.
 */
export const compareConnectorNodes = (
  a?: { kind?: string; label?: string },
  b?: { kind?: string; label?: string }
): number => {
  const kindA = a?.kind;
  const kindB = b?.kind;

  if (kindA === 'relationship' && kindB === 'event') return -1;
  if (kindA === 'event' && kindB === 'relationship') return 1;

  const labelA = a?.label ?? '';
  const labelB = b?.label ?? '';
  return labelA.localeCompare(labelB);
};

/**
 * Normalizes a value to an array of strings.
 * ESQL returns single values as scalars but multi-value fields as arrays.
 * This utility handles both cases uniformly.
 *
 * @param value - The value to normalize (string, string[], null, or undefined)
 * @returns An array of strings, or undefined if the input was null/undefined
 */
export const normalizeToArray = (value?: string | string[] | null): string[] | undefined => {
  if (value === undefined || value === null) return undefined;
  return Array.isArray(value) ? value : [value];
};
