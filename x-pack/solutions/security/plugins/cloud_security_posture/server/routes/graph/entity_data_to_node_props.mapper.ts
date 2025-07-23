/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDetailsModel } from '@kbn/cloud-security-posture-common/types/graph/v1';
import { entityTypeMappings } from './entity_type_constants';

/**
 * Interface for the input parameters to mapEntityDataToNodeProps
 */
export interface EntityDataToNodePropsParams {
  entityData: EntityDetailsModel;
  nodeFieldsMapping: NodeFieldsMapping; // Maps entity fields to node fields
}

/**
 * Interface for the output properties from mapEntityDataToNodeProps
 */
export interface MappedNodeProps {
  label?: string;
  icon?: string;
  // Additional properties can be added here in the future
}

/**
 * Type that defines mapping from EntityDetailsModel fields to MappedNodeProps fields
 * with optional transform functions
 */
export type NodeFieldsMapping = {
  [K in keyof EntityDetailsModel]?: {
    targetField: keyof MappedNodeProps;
    transform?: (value: EntityDetailsModel[K]) => any;
  }; // Advanced mapping with transform
};

/**
 * Maps entity data to node properties for visualization.
 * This function extracts relevant information from entity data and maps it to
 * properties used by the graph visualization components.
 *
 * @param params Object containing entity data and mapping configuration
 * @returns Mapped node properties
 */
export const mapEntityDataToNodeProps = (params: EntityDataToNodePropsParams): MappedNodeProps => {
  const { entityData, nodeFieldsMapping } = params;

  const mappedProps: MappedNodeProps = {};

  // Apply field mappings from entityData to mappedProps
  Object.entries(nodeFieldsMapping).forEach(([entityField, fieldConfig]) => {
    const entityKey = entityField as keyof EntityDetailsModel;
    const entityValue = entityData && entityKey in entityData ? entityData[entityKey] : undefined;

    if (entityValue === undefined) {
      return; // Skip if entity value is undefined
    }
    // Extract the target field and transform function
    const { targetField, transform } = fieldConfig;

    // Apply transform if provided, otherwise use the value directly
    const transformedValue = transform ? transform(entityValue) : entityValue;

    mappedProps[targetField] = transformedValue;
  });

  return mappedProps;
};

/**
 * Transforms entity type values to standardized icon names
 * This helps normalize different entity type representations to consistent icon names
 *
 * @param entityType The entity type value to transform
 * @returns The standardized icon name
 */
export const transformEntityTypeToIcon = (entityType: string | undefined): string | undefined => {
  if (!entityType) {
    return undefined;
  }

  // Convert to lowercase for case-insensitive comparison
  const entityTypeLower = entityType.toLowerCase();

  // Find the first matching mapping where the entity type is in the values array
  const mappingResult = entityTypeMappings.find((mapping) =>
    mapping.values.some((type: string) => entityTypeLower === type.toLowerCase())
  );
  // Return the icon name if found, otherwise we return undefined
  return mappingResult?.icon ?? undefined;
};
