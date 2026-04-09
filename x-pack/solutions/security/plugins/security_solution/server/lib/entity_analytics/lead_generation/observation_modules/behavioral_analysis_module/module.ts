/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { LeadEntity, Observation, ObservationModule } from '../../types';
import { MODULE_ID, MODULE_NAME, MODULE_PRIORITY } from './config';
import { fetchAlertSummariesForEntities } from './data_access';
import { buildObservationsForEntity } from './observations';

interface BehavioralAnalysisModuleDeps {
  readonly esClient: ElasticsearchClient;
  readonly logger: Logger;
  readonly alertsIndexPattern: string;
}

export const createBehavioralAnalysisModule = ({
  esClient,
  logger,
  alertsIndexPattern,
}: BehavioralAnalysisModuleDeps): ObservationModule => ({
  config: { id: MODULE_ID, name: MODULE_NAME, priority: MODULE_PRIORITY },

  isEnabled: () => Boolean(alertsIndexPattern),

  async collect(entities: LeadEntity[]): Promise<Observation[]> {
    const alertDataByEntity = await fetchAlertSummariesForEntities(
      esClient,
      alertsIndexPattern,
      entities,
      logger
    );
    const observations: Observation[] = [];

    for (const entity of entities) {
      const summary = alertDataByEntity.get(`${entity.type}:${entity.name}`);
      if (summary && summary.totalAlerts > 0) {
        observations.push(...buildObservationsForEntity(entity, summary));
      }
    }

    logger.debug(
      `[${MODULE_ID}] Collected ${observations.length} observations from ${entities.length} entities`
    );
    return observations;
  },
});
