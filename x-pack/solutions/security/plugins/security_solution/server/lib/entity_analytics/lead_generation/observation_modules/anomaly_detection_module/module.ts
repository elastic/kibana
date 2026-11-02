/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { LeadEntity, Observation, ObservationModule } from '../../types';
import { OBSERVATION_MODULE_WEIGHTS } from '../weights';
import { MODULE_ID, MODULE_NAME, MODULE_PRIORITY } from './config';
import { fetchAnomalySummariesForEntities } from './data_access';
import { buildAnomalyObservation } from './observations';

interface AnomalyDetectionModuleDeps {
  readonly logger: Logger;
  readonly ml?: MlPluginSetup;
  readonly request?: KibanaRequest;
  readonly soClient?: SavedObjectsClientContract;
}

/**
 * Surfaces high-scoring security ML anomalies as observations so leads can
 * express behavioral hypotheses (unusual activity volume, rare processes,
 * off-hours access). Self-disables when the ML plugin, request, or saved
 * objects client are unavailable (e.g. Task Manager runs without ML).
 */
export const createAnomalyDetectionModule = ({
  logger,
  ml,
  request,
  soClient,
}: AnomalyDetectionModuleDeps): ObservationModule => ({
  config: {
    id: MODULE_ID,
    name: MODULE_NAME,
    priority: MODULE_PRIORITY,
    weight: OBSERVATION_MODULE_WEIGHTS.anomaly_detection,
  },

  isEnabled: () => Boolean(ml && request && soClient),

  async collect(entities: LeadEntity[]): Promise<Observation[]> {
    if (!ml || !request || !soClient) return [];

    const summaries = await fetchAnomalySummariesForEntities({
      ml,
      request,
      soClient,
      entities,
      logger,
    });

    const observations: Observation[] = [];
    for (const entity of entities) {
      const summary = summaries.get(entity.id);
      if (summary) {
        observations.push(buildAnomalyObservation(entity, summary));
      }
    }

    logger.debug(
      `[${MODULE_ID}] Collected ${observations.length} observations from ${entities.length} entities`
    );
    return observations;
  },
});
