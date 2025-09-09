/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EntityDocumentDataModel,
  EntityNodeDataModel,
} from '@kbn/cloud-security-posture-common/types/graph/v1';
import { entityTypeMappings } from './entity_type_constants';

/**
 * Interface for visual properties returned by the transform function
 */
export interface EntityVisualProps {
  icon?: string;
  shape?: EntityNodeDataModel['shape'];
}

/**
 * Transforms entity data to standardized icon and shape values
 * This helps normalize different entity type representations to consistent visual properties
 *
 * @param entity The entity document data model
 * @returns Object containing the icon and shape for the entity
 */
export const transformEntityTypeToIconAndShape = (
  entity: EntityDocumentDataModel
): EntityVisualProps => {
  if (!entity?.type) {
    return {};
  }

  const entityTypeLower = entity.type.toLowerCase();

  return {
    icon: entityTypeMappings.icons[entityTypeLower],
    shape: entityTypeMappings.shapes[entityTypeLower],
  };
};
