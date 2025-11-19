/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncForEach } from '@kbn/std';
import { first } from 'lodash/fp';
import type { EntityAnalyticsMigrationsParams } from '../../migrations';
import { getApiKeyManager } from '../auth/api_key';
import { createInitialisationSourcesService } from '../engine/initialisation_sources_service';
import { MonitoringEntitySourceDescriptorClient } from '../saved_objects/monitoring_entity_source';
import { PrivilegeMonitoringEngineDescriptorClient } from '../saved_objects';

/**
 * This migration runs when the privilege monitoring engine is enabled for a space.
 * This migration is required for the scenario where users installed the privilege monitoring engine in an older version.
 */
export const upsertPrivilegedMonitoringEntitySource = async ({
  logger,
  getStartServices,
}: EntityAnalyticsMigrationsParams) => {
  const [core, { security, encryptedSavedObjects }] = await getStartServices();

  const soClientGlobal = core.savedObjects.createInternalRepository();

  const engineClient = new PrivilegeMonitoringEngineDescriptorClient({
    soClient: soClientGlobal,
    namespace: '*', // get all engines from all namespaces
  });
  const engines = await engineClient.find();

  if (engines.total === 0) {
    logger.info('No privilege monitoring engine descriptor found. Skipping migration.');
    return;
  }

  // namespaces where engines are installed
  const namespaces = engines.saved_objects.map((savedObject) => first(savedObject.namespaces));

  await asyncForEach(namespaces, async (namespace) => {
    if (!namespace) {
      logger.error(
        'Unexpected saved object. Monitoring Entity Source Score saved objects must have a namespace'
      );
      return;
    }

    const apiKeyManager = getApiKeyManager({
      core,
      logger,
      security,
      encryptedSavedObjects,
      namespace,
    });

    const client = await apiKeyManager.getClient();
    if (!client?.soClient) {
      logger.error('[Privilege Monitoring] Unable to create Elasticsearch client from API key.');
      return undefined;
    }

    const soClient = client.soClient.asScopedToNamespace(namespace); // The saved objects client returned is unscoped
    const sourceClient = new MonitoringEntitySourceDescriptorClient({
      soClient,
      namespace,
    });

    const upsertSources = createInitialisationSourcesService({
      descriptorClient: sourceClient,
      logger,
      auditLogger: core.security.audit.withoutRequest,
    });

    await upsertSources(namespace);
  });
};
