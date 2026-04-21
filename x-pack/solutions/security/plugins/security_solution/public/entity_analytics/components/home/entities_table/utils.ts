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
    id?: string;
    name?: string;
    EngineMetadata?: { Type?: EntityType };
  };
  user?: { name?: string };
  host?: { name?: string };
  service?: { name?: string };
}

export const getEntityFields = (doc: DataTableRecord) => {
  const source = doc.raw._source as EntitySource;
  const { entity } = source;
  const entityType = entity?.EngineMetadata?.Type;

  // entity.name can be a composed display name (e.g., user.name@host.name for local users in
  // Entity Store v2), which differs from the ECS identity field (user.name) stored in alerts.
  // entityIdentifier is the raw identity field value used for alert count queries.
  const entityIdentifier =
    (entityType === 'user'
      ? source.user?.name
      : entityType === 'host'
      ? source.host?.name
      : entityType === 'service'
      ? source.service?.name
      : undefined) ?? entity?.name;

  return {
    entityType,
    entityName: entity?.name,
    entityId: entity?.id,
    entityIdentifier,
  };
};
