/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityTypeToIdentifierField } from '../../../../../common/entity_analytics/types';
import { getAssetCriticalityIndex } from '../../../../../common/entity_analytics/asset_criticality';
import type { EntityType } from '../../../../../common/search_strategy';
import type { EntityAnalyticsSubTool } from './types';

export const getAssetCriticalitySubTool: EntityAnalyticsSubTool = async (
  entityType: EntityType,
  { spaceId }
) => {
  const assetCriticalityIndexPattern = getAssetCriticalityIndex(spaceId);
  return {
    message: `
      This is a set of rules that you must follow strictly:
      * When searching asset criticality for '${entityType}' you **MUST ALWAYS** filter by: 'where id_field == "${EntityTypeToIdentifierField[entityType]}"'.
      * The criticality value is stored in the field 'criticality_level'.`,
    index: assetCriticalityIndexPattern,
  };
};
