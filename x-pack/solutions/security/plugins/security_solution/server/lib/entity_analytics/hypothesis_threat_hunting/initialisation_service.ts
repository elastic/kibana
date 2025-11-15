/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract, CoreAuditService } from '@kbn/core/server';
import type { HypothesisUpsertResult } from './saved_objects/threat_hunting_hypothesis_descriptor';
import { ThreatHuntingHypothesisDescriptorClient } from './saved_objects/threat_hunting_hypothesis_descriptor';
import { createThreatHuntingHypothesesAuditLoggerService } from './utils/audit_logger_service';
import { createThreatHuntingHypothesesLoggerService } from './utils/logger_service';
import { ThreatHuntingHypothesisActions } from './auditing/actions';
import { getHypothesisDefinitions, HYPOTHESES_VERSION } from './lib/hypothesis_definitions';

export type ThreatHuntingHypothesesInitService = ReturnType<
  typeof createThreatHuntingHypothesesInitService
>;

export const initThreatHuntingHypothesisDefinitions = async (
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger,
  auditService: CoreAuditService
) => {
  const initService = createThreatHuntingHypothesesInitService(
    savedObjectsClient,
    logger,
    auditService
  );
  const initResult = await initService.init();
  return initResult;
};

export const createThreatHuntingHypothesesInitService = (
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger,
  auditService: CoreAuditService
) => {
  const loggingService = createThreatHuntingHypothesesLoggerService(
    logger,
    'threat_hunting_initialisation'
  );
  const auditLoggerService = createThreatHuntingHypothesesAuditLoggerService(auditService);

  const descriptor = new ThreatHuntingHypothesisDescriptorClient({
    savedObjectsClient,
  });

  const init = async (): Promise<HypothesisUpsertResult> => {
    try {
      const upsertRes = await descriptor.bulkUpsert(getHypothesisDefinitions(HYPOTHESES_VERSION));
      loggingService.debug(
        `Threat Hunting Hypotheses definitions upsert on startup: ${upsertRes.created} created, ${upsertRes.updated} updated`
      );
      return upsertRes;
    } catch (error) {
      loggingService.error(
        `Failed to initialise Threat Hunting Hypotheses definitions: ${error.message}`
      );
      auditLoggerService.log(
        ThreatHuntingHypothesisActions.CREATE,
        `Failed to initialise Threat Hunting Hypotheses definitions: ${error.message}`,
        error
      );
    }
    return { created: 0, updated: 0, results: [] };
  };

  return {
    init,
  };
};
