/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract, AuditLogger } from '@kbn/core/server';
import { hypothesisDefinitions } from '../lib/hypothesis_definitions';
import { ThreatHuntingHypothesisDescriptorClient } from '../saved_objects/threat_hunting_hypothesis_descriptor';
import { createThreatHuntingHypothesesLoggerService } from '../utils/logger_service';
import { createThreatHuntingHypothesesAuditLoggerService } from '../utils/audit_logger_service';
import { ThreatHuntingHypothesisActions } from '../auditing/actions';

export type ThreatHuntingHypothesesService = ReturnType<
  typeof createThreatHuntingHypothesesInitService
>;

export const initThreatHuntingHypothesisDefinitions = async (
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger,
  auditLogger: AuditLogger
) => {
  const initService = createThreatHuntingHypothesesInitService(
    savedObjectsClient,
    logger,
    auditLogger
  );
  await initService.init();
};

export const createThreatHuntingHypothesesInitService = (
  soClient: SavedObjectsClientContract,
  logger: Logger,
  auditLogger: AuditLogger
) => {
  const loggingService = createThreatHuntingHypothesesLoggerService(
    logger,
    'threat_hunting_initialisation'
  );
  const auditLoggerService = createThreatHuntingHypothesesAuditLoggerService(
    'default', // TODO pull in current namespace from deps object
    auditLogger
  );

  const descriptor = new ThreatHuntingHypothesisDescriptorClient({
    soClient,
    namespace: 'default', // TODO pull in multiple from deps object. Keep it slim.
  });

  const init = async (): Promise<void> => {
    if (await isSetupRequired()) {
      try {
        loggingService.info('Setup required - initializing Threat Hunting Hypotheses definitions');
        const results = await descriptor.bulkCreate(hypothesisDefinitions);
        loggingService.info(
          `Initialized Threat Hunting Hypotheses definitions: ${results.length} created`
        );
      } catch (error) {
        loggingService.error(
          `Failed to initialize Threat Hunting Hypotheses definitions: ${error.message}`
        );
        auditLoggerService.log(
          ThreatHuntingHypothesisActions.CREATE,
          `Failed to initialize Threat Hunting Hypotheses definitions: ${error.message}`,
          error
        );
      }
    }
  };

  /**
   * If there are no saved objects with Threat Hunting Hypotheses definitions, setup is required.
   * @returns True if setup is required, false otherwise.
   */
  const isSetupRequired = async (): Promise<boolean> => {
    const hypothesesSavedObjects = await descriptor.getAll();
    return Object.keys(hypothesesSavedObjects).length === 0;
  };

  return {
    init,
  };
};
