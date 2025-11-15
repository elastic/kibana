/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { initThreatHuntingHypothesisDefinitions } from './initialisation_service';
import { reconcileThreatHuntingHypothesesDefinitions } from './reconciliation_service';
import type { EntityAnalyticsMigrationsParams } from '../migrations';

export const updateThreatHuntingHypothesisDefinitions = async ({
  logger,
  getStartServices,
}: EntityAnalyticsMigrationsParams) => {
  const [core] = await getStartServices();

  const soClientGlobal = core.savedObjects.createInternalRepository();
  const auditService = core.security.audit;
  try {
    // init: upsert on startup
    const upsertRes = await initThreatHuntingHypothesisDefinitions(
      soClientGlobal,
      logger,
      auditService
    );
    // reconcile: delete outdated saved objects
    const deleted = await reconcileThreatHuntingHypothesesDefinitions(
      soClientGlobal,
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
