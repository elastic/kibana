/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DataTableRecord } from '@kbn/discover-utils/types';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import type { ESBoolQuery } from '../../../../../common/typed_json';

interface EntitySource {
  entity?: {
    id?: string;
    name?: string;
    EngineMetadata?: { Type?: EntityType };
  };
}

export const getEntityFields = (doc: DataTableRecord) => {
  const { entity } = doc.raw._source as EntitySource;
  return {
    entityType: entity?.EngineMetadata?.Type,
    entityName: entity?.name,
    entityId: entity?.id,
  };
};

/** True when a bool query has any top-level must/filter/should/must_not clause. */
export const hasActiveTopLevelBoolClauses = (
  filterQuery: ESBoolQuery | undefined | null
): filterQuery is ESBoolQuery => {
  if (!filterQuery?.bool) {
    return false;
  }
  const { must, filter, should, must_not } = filterQuery.bool;
  const hasClauses = (clause: unknown): boolean => {
    if (clause == null) {
      return false;
    }
    return Array.isArray(clause) ? clause.length > 0 : true;
  };
  return hasClauses(must) || hasClauses(filter) || hasClauses(should) || hasClauses(must_not);
};
