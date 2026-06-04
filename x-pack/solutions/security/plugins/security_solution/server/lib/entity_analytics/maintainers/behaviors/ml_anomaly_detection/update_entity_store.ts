/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Entity, EntityType } from '@kbn/entity-store/common';
import type { BulkObject, EntityUpdateClient } from '@kbn/entity-store/server';
import type { EntityAnomalies } from './fetch_anomalies';

interface UpdateEntityStoreOpts {
  anomaliesByEntity: Map<string, EntityAnomalies>;
  entityType: string;
  logger: Logger;
  updateClient: EntityUpdateClient;
}
export const updateEntityStore = async ({
  anomaliesByEntity,
  entityType,
  logger,
  updateClient,
}: UpdateEntityStoreOpts) => {
  const updateObjects = Array.from(anomaliesByEntity.entries())
    .filter(([_, entityAnomalies]) => Object.keys(entityAnomalies).length > 0)
    .map(
      ([entityId, entityAnomalies]) =>
        ({
          type: entityType as EntityType,
          doc: {
            entity: {
              id: entityId,
              behaviors: { anomaly_job_ids: Object.keys(entityAnomalies) },
            } as Entity,
          },
        } as BulkObject)
    );

  if (updateObjects.length > 0) {
    const errors = await updateClient.bulkUpdateEntity({ objects: updateObjects });
    if (errors.length > 0) {
      logger.warn(
        `Bulk entity update returned ${errors.length} error(s) - ${JSON.stringify(errors)}`
      );
    }
  }
};
