/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncForEach } from '@kbn/std';
import { first } from 'lodash/fp';
import type { EntityAnalyticsMigrationsParams } from '../../migrations';
import { monitoringEntitySourceTypeName } from '../saved_objects/monitoring_entity_source_type';
import type { MonitoringEntitySource } from '../../../../../common/api/entity_analytics';
import { getApiKeyManager } from '../auth/api_key';
import { deleteUsersWithSourceIndexFactory } from '../data_sources/migrations/delete_user_with_source_indices';
import { migrateSourceIndexFactory } from '../data_sources/migrations/source_index_update';
import { shouldRunSourceMigrationFactory } from '../data_sources/migrations/check_if_entity_source_migration';

export const MAX_PER_PAGE = 10_000;

export const updatePrivilegedMonitoringSourceIndex = async ({
  logger,
  getStartServices,
}: EntityAnalyticsMigrationsParams) => {
  const [core, { security, encryptedSavedObjects }] = await getStartServices();

  const internalEsClient = core.elasticsearch.client.asInternalUser;

  const shouldRunMigration = shouldRunSourceMigrationFactory({
    esClient: internalEsClient,
  });
  const shouldRun = await shouldRunMigration('*');
  if (!shouldRun) {
    logger.info('Skipping migration for Privileged Monitoring Entity Source.');
    return;
  }

  const soClientGlobal = core.savedObjects.createInternalRepository();

  const savedObjectsResponse = await soClientGlobal.find<MonitoringEntitySource>({
    type: monitoringEntitySourceTypeName,
    perPage: MAX_PER_PAGE,
    namespaces: ['*'],
  });

  await asyncForEach(savedObjectsResponse.saved_objects, async (savedObject) => {
    const namespace = first(savedObject.namespaces); // We install an entity source on a single space

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

    if (!client) {
      logger.error('[Privilege Monitoring] Unable to create Elasticsearch client from API key.');
      return undefined;
    }

    const migrateSourceIndex = migrateSourceIndexFactory({
      logger,
      esClient: client.clusterClient.asCurrentUser,
    });

    await migrateSourceIndex(namespace, savedObject.attributes.indexPattern, savedObject.id);
  });

  const deleteUsersWithSourceIndex = deleteUsersWithSourceIndexFactory({
    esClient: internalEsClient,
  });
  await deleteUsersWithSourceIndex('*');
};
