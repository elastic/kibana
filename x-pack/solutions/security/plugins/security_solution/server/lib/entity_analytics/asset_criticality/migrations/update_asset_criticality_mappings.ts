/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsMigrationsParams } from '../../migrations';

import { AssetCriticalityMigrationClient } from '../asset_criticality_migration_client';

export const updateAssetCriticalityMappings = async ({
  auditLogger,
  logger,
  getStartServices,
}: EntityAnalyticsMigrationsParams) => {
  const [coreStart] = await getStartServices();
  const esClient = coreStart.elasticsearch.client.asInternalUser;

  const migrationClient = new AssetCriticalityMigrationClient({
    esClient,
    logger,
    auditLogger,
  });

  const shouldMigrateMappings = await migrationClient.isMappingsMigrationRequired();
  if (shouldMigrateMappings) {
    logger.info('Migrating Asset Criticality mappings');
    await migrationClient.migrateMappings();
  }
};
