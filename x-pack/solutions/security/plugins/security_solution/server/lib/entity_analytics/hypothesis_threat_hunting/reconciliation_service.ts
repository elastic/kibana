/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreAuditService, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { HYPOTHESES_VERSION } from './lib/hypothesis_definitions';
import { ThreatHuntingHypothesisDescriptorClient } from './saved_objects/threat_hunting_hypothesis_descriptor';
import { createThreatHuntingHypothesesLoggerService } from './utils/logger_service';
import { ThreatHuntingHypothesisActions } from './auditing/actions';
import { createThreatHuntingHypothesesAuditLoggerService } from './utils/audit_logger_service';

export type ThreatHuntingHypothesesService = ReturnType<
  typeof createThreatHuntingHypothesesReconciliationService
>;

export const reconcileThreatHuntingHypothesesDefinitions = async (
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger,
  auditService: CoreAuditService
) => {
  const reconciliationService = await createThreatHuntingHypothesesReconciliationService({
    savedObjectsClient,
    logger,
    auditService,
  });
  const reconcileResult = await reconciliationService.reconcile();
  return reconcileResult;
};
export const createThreatHuntingHypothesesReconciliationService = async ({
  savedObjectsClient,
  logger,
  auditService,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  auditService: CoreAuditService;
}) => {
  const descriptor = new ThreatHuntingHypothesisDescriptorClient({
    savedObjectsClient,
  });
  const loggingService = createThreatHuntingHypothesesLoggerService(
    logger,
    'threat_hunting_initialisation'
  );
  const auditLoggerService = createThreatHuntingHypothesesAuditLoggerService(auditService);
  /**
   * Reconciles the Threat Hunting Hypotheses definitions by deleting any saved objects
   * that are no longer in the definitions (i.e., their version is outdated).
   * @returns The number of deleted saved objects.
   */
  const reconcile = async (): Promise<number> => {
    const hypothesesSavedObjects = await descriptor.getAll();
    let deletedCount = 0;
    // Delete any saved objects that are no longer in the definitions
    await Promise.all(
      Object.entries(hypothesesSavedObjects).map(async ([id, hypothesis]) => {
        try {
          if (hypothesis.version !== HYPOTHESES_VERSION) {
            await descriptor.delete(id);
            deletedCount++;
          }
        } catch (error) {
          const failureMsg = `Failed to delete outdated Threat Hunting Hypothesis saved object with id ${id}: ${error.message}`;
          loggingService.warn(failureMsg);
          auditLoggerService.log(ThreatHuntingHypothesisActions.DELETE, failureMsg, error);
        }
      })
    );
    return deletedCount;
  };

  return {
    reconcile,
  };
};
