/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DataTableRecord } from '@kbn/discover-utils/types';
import type { EntityType } from '../../../../../common/entity_analytics/types';

interface EntitySource {
  entity?: {
    name?: string;
    EngineMetadata?: { Type?: EntityType };
  };
}

export const getEntityFields = (doc: DataTableRecord) => {
  const { entity } = doc.raw._source as EntitySource;
  return {
    entityType: entity?.EngineMetadata?.Type,
    entityName: entity?.name,
  };
};
