/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { HYPOTHESES_VERSION, hypothesisDefinitions } from './lib/hypothesis_definitions';
import { ThreatHuntingHypothesisDescriptorClient } from './saved_objects/threat_hunting_hypothesis_descriptor';
import { createThreatHuntingHypothesesLoggerService } from './utils/logger_service';

export type ThreatHuntingHypothesesService = ReturnType<
  typeof createThreatHuntingHypothesesReconciliationService
>;

export const reconcileThreatHuntingHypothesesDefinitions = async (
  logger: Logger,
  savedObjectsClient: SavedObjectsClientContract
) => {
  const reconciliationService = await createThreatHuntingHypothesesReconciliationService({
    logger,
    savedObjectsClient,
  });
  await reconciliationService.reconcile();
};
export const createThreatHuntingHypothesesReconciliationService = async ({
  logger,
  savedObjectsClient,
}: {
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
}) => {
  const loggingService = createThreatHuntingHypothesesLoggerService(
    logger,
    'threat_hunting_initialisation'
  );
  const descriptor = new ThreatHuntingHypothesisDescriptorClient({
    savedObjectsClient,
  });
  const reconcile = async (): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log('Reconciling Threat Hunting Hypotheses definitions BOOP');
    const hypothesesSavedObjects = await descriptor.getAll();
    let deletedCount = 0;
    // Delete any saved objects that are no longer in the definitions
    await Promise.all(
      Object.entries(hypothesesSavedObjects).map(async ([id, hypothesis]) => {
        if (hypothesis.version !== HYPOTHESES_VERSION) {
          await descriptor.delete(id);
          deletedCount++;
        }
      })
    );
    // filter to latest version only, in case multiple versions exist
    const currentHypothesesDefinitions = hypothesisDefinitions.filter(
      (def) => def.version === HYPOTHESES_VERSION
    );
    // upsert definitions - only current version SO should exist after delete step
    const results = await descriptor.bulkUpsert(currentHypothesesDefinitions);
    loggingService.info(
      `Reconciled Threat Hunting Hypotheses definitions: ${deletedCount} deleted , ${results.created} created, ${results.updated} updated`
    );
  };

  return {
    reconcile,
  };
};
