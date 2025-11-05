/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { hypothesisDefinitions } from '../lib/hypothesis_definitions';
import { ThreatHuntingHypothesisDescriptorClient } from '../saved_objects/threat_hunting_hypothesis_descriptor';
import { createLoggerService } from '../utils/logger_service';

export type InitialisationService = ReturnType<typeof createInitialisationService>;

export const createInitialisationService = (
  soClient: SavedObjectsClientContract,
  logger: Logger
) => {
  const loggingService = createLoggerService(logger, 'threat_hunting_initialisation');
  const init = async (): Promise<void> => {
    /**
     * On startup - pull from the hardcoded list of Hypothesis Definitions
     * and create the necessary saved objects.
     * Start with one space, then expand to multiple spaces.
     */
    const descriptor = new ThreatHuntingHypothesisDescriptorClient({
      soClient,
      namespace: 'default', // TODO pull in multiple from deps object. Keep it slim.
    });
    loggingService.info('Starting Threat Hunting Hypotheses definitions initialisation');
    // TODO: audit logging
    try {
      // await descriptor.bulkUpsert(hypothesisDefinitions); TODO: update to this.
      // This is where you will want to use update service instead of calling the SO client directly.
      await descriptor.bulkCreate(hypothesisDefinitions); // POC v1 prove you can save down the hardcoded list.
      loggingService.info('Successfully created x Threat Hunting Hypotheses definitions');
    } catch (error) {
      loggingService.error(
        `Failed to create x Threat Hunting Hypotheses definitions: ${error.message}`
      );
    }
  };

  return {
    init,
  };
};
