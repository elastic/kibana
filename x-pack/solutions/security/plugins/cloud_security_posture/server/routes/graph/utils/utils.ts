/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityNodeDataModel } from '@kbn/cloud-security-posture-common/types/graph/v1';
import { entityTypeMappings } from '../entity_type_constants';

/**
 * Interface for visual properties returned by the transform function
 */
export interface EntityVisualProps {
  icon?: string;
  shape?: EntityNodeDataModel['shape'];
}

/**
 * Transforms entity type to standardized icon and shape values
 * This helps normalize different entity type representations to consistent visual properties
 *
 * @param entityGroupType The type of the entity group
 * @returns Object containing the icon and shape for the entity
 */
export const transformEntityTypeToIconAndShape = (entityGroupType: string): EntityVisualProps => {
  if (!entityGroupType) {
    return {};
  }

  const entityGroupTypeLower = entityGroupType.toLowerCase();

  return {
    icon: entityTypeMappings.icons[entityGroupTypeLower],
    shape: entityTypeMappings.shapes[entityGroupTypeLower],
  };
};

/**
 * Comparator for sorting connector nodes: relationship nodes first, then label nodes,
 * then alphabetically by label within each group.
 * Accepts objects with at least { shape?: string; label?: string }.
 */
export const compareConnectorNodes = (
  a?: { shape?: string; label?: string },
  b?: { shape?: string; label?: string }
): number => {
  const shapeA = a?.shape;
  const shapeB = b?.shape;

  if (shapeA === 'relationship' && shapeB === 'label') return -1;
  if (shapeA === 'label' && shapeB === 'relationship') return 1;

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
