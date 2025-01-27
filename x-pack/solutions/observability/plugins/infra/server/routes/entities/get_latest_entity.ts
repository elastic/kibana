/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityClient } from '@kbn/entityManager-plugin/server/lib/entity_client';
import type { Logger } from '@kbn/logging';
import { isArray } from 'lodash';

interface EntitySourceResponse {
  sourceDataStreamType?: string | string[];
}

export async function getLatestEntity({
  entityId,
  entityType,
  entityManagerClient,
  from,
  to,
  logger,
}: {
  entityType: string;
  entityId: string;
  entityManagerClient: EntityClient;
  from: string;
  to: string;
  logger: Logger;
}): Promise<EntitySourceResponse | undefined> {
  try {
    const entityDefinitionsSource = await entityManagerClient.v2.readSourceDefinitions({
      type: entityType,
    });

    const hostOrContainerIdentityField = entityDefinitionsSource[0]?.identity_fields?.[0];
    if (hostOrContainerIdentityField === undefined) {
      return undefined;
    }

    const { entities } = await entityManagerClient.v2.searchEntities({
      type: entityType,
      limit: 1,
      metadata_fields: ['data_stream.type'],
      filters: [`${hostOrContainerIdentityField}: "${entityId}"`],
      start: from,
      end: to,
    });

    const entityDataStreamType = entities[0]['data_stream.type'];

    return {
      sourceDataStreamType: isArray(entityDataStreamType)
        ? entityDataStreamType.filter(Boolean)
        : entityDataStreamType,
    };
  } catch (e) {
    logger.error(e);
  }
}
