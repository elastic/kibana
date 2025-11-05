/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { hypothesisDefinitionsScaled } from '../lib/hypothesis_definitions';
import { ThreatHuntingHypothesisDescriptorClient } from '../saved_objects/threat_hunting_hypothesis_descriptor';
import { createLoggerService } from '../utils/logger_service';

export type ThreatHuntingHypothesesService = ReturnType<
  typeof createThreatHuntingHypothesesInitService
>;

export const initThreatHuntingHypothesisDefinitions = async (
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger
) => {
  const initService = createThreatHuntingHypothesesInitService(savedObjectsClient, logger);
  await initService.init();
};

export const createThreatHuntingHypothesesInitService = (
  soClient: SavedObjectsClientContract,
  logger: Logger
) => {
  const loggingService = createLoggerService(logger, 'threat_hunting_initialisation');
  const init = async (): Promise<void> => {
    const started = performance.now();
    /**
     * On startup - pull from the hardcoded list of Hypothesis Definitions
     * and create the necessary saved objects.
     * Start with one space, then expand to multiple spaces.
     */
    const descriptor = new ThreatHuntingHypothesisDescriptorClient({
      soClient,
      namespace: 'default', // TODO pull in multiple from deps object. Keep it slim.
    });
    const hypothesisDefinitions = hypothesisDefinitionsScaled;
    loggingService.info('Starting Threat Hunting Hypotheses definitions initialisation');
    // TODO: audit logging
    try {
      // await descriptor.bulkUpsert(hypothesisDefinitions); TODO: update to this.
      // This is where you will want to use update service instead of calling the SO client directly.
      loggingService.info(
        `Creating ${hypothesisDefinitions.length} Threat Hunting Hypotheses definitions`
      );
      const created = await descriptor.bulkCreate(hypothesisDefinitions); // POC v1 prove you can save down the hardcoded list.
      const elapsed = (performance.now() - started) / 1000;
      loggingService.info(
        `Successfully created ${
          created.saved_objects.length
        } Threat Hunting Hypotheses definitions in time: ${elapsed.toFixed(2)}s`
      );
      loggingService.info(`Saved Objects: ${JSON.stringify(created.saved_objects)}`);
    } catch (error) {
      loggingService.error(
        `Failed to create Threat Hunting Hypotheses definitions: ${error.message}`
      );
    }
  };

  return {
    init,
  };
};
