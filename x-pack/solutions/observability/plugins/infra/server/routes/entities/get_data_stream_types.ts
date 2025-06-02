/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EntityClient } from '@kbn/entityManager-plugin/server/lib/entity_client';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import { EntityDataStreamType } from '@kbn/observability-shared-plugin/common';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { castArray } from 'lodash';
import type { Logger } from '@kbn/logging';
import { type InfraMetricsClient } from '../../lib/helpers/get_infra_metrics_client';
import { getHasMetricsData } from './get_has_metrics_data';
import { getLatestEntity } from './get_latest_entity';

interface Params {
  entityId: string;
  entityType: string;
  entityFilterType: string;
  entityCentricExperienceEnabled: boolean;
  infraMetricsClient: InfraMetricsClient;
  obsEsClient: TracedElasticsearchClient;
  entityManagerClient: EntityClient;
  logger: Logger;
  from: string;
  to: string;
}

export async function getDataStreamTypes({
  entityCentricExperienceEnabled,
  entityId,
  entityManagerClient,
  entityType,
  entityFilterType,
  infraMetricsClient,
  from,
  to,
  logger,
}: Params) {
  const hasMetricsData = await getHasMetricsData({
    infraMetricsClient,
    entityId,
    field: findInventoryFields(entityFilterType as InventoryItemType).id,
  });

  const sourceDataStreams = new Set(hasMetricsData ? [EntityDataStreamType.METRICS] : []);

  if (!entityCentricExperienceEnabled) {
    return Array.from(sourceDataStreams);
  }

  const latestEntity = await getLatestEntity({
    entityId,
    entityType,
    entityManagerClient,
    logger,
    from,
    to,
  });

  if (latestEntity) {
    castArray(latestEntity.sourceDataStreamType).forEach((item) => {
      if (
        [EntityDataStreamType.LOGS, EntityDataStreamType.METRICS].includes(
          item as EntityDataStreamType
        )
      ) {
        sourceDataStreams.add(item as EntityDataStreamType);
      }
    });
  }

  return Array.from(sourceDataStreams).filter(Boolean);
}
