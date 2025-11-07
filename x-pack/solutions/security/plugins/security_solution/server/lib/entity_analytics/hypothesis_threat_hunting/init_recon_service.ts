/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract, CoreAuditService } from '@kbn/core/server';
import { initThreatHuntingHypothesisDefinitions } from './initialisation_service';
import { reconcileThreatHuntingHypothesesDefinitions } from './reconciliation_service';

export const initAndReconcileThreatHuntingHypothesisDefinitions = async (
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger,
  auditService: CoreAuditService
) => {
  try {
    // init: upsert on startup
    const upsertRes = await initThreatHuntingHypothesisDefinitions(
      savedObjectsClient,
      logger,
      auditService
    );
    // reconcile: delete outdated saved objects
    // TODO: specified AFTER startup - clarify when?
    const deleted = await reconcileThreatHuntingHypothesesDefinitions(
      savedObjectsClient,
      logger,
      auditService
    );
    logger.info(
      `Hypotheses reconciliation: ${upsertRes.created} created, ${upsertRes.updated} updated, ${deleted} deleted`
    );
  } catch (error) {
    logger.error(`Hypotheses init/reconcile failed: ${error?.message ?? error}`);
  }
};
