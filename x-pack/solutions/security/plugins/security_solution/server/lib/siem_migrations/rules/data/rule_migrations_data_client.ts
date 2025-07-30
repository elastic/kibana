/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, IScopedClusterClient, Logger } from '@kbn/core/server';
import { RuleMigrationsDataIntegrationsClient } from './rule_migrations_data_integrations_client';
import { RuleMigrationsDataPrebuiltRulesClient } from './rule_migrations_data_prebuilt_rules_client';
import { RuleMigrationsDataResourcesClient } from './rule_migrations_data_resources_client';
import { RuleMigrationsDataRulesClient } from './rule_migrations_data_rules_client';
import { RuleMigrationsDataLookupsClient } from './rule_migrations_data_lookups_client';
import type { RuleMigrationIndexNameProviders } from '../types';
import { RuleMigrationsDataMigrationClient } from './rule_migrations_data_migration_client';
import type { SiemMigrationsClientDependencies } from '../../common/types';

export class RuleMigrationsDataClient {
  protected logger: Logger;
  protected esClient: IScopedClusterClient['asInternalUser'];

  public readonly migrations: RuleMigrationsDataMigrationClient;
  public readonly rules: RuleMigrationsDataRulesClient;
  public readonly resources: RuleMigrationsDataResourcesClient;
  public readonly integrations: RuleMigrationsDataIntegrationsClient;
  public readonly prebuiltRules: RuleMigrationsDataPrebuiltRulesClient;
  public readonly lookups: RuleMigrationsDataLookupsClient;

  constructor(
    indexNameProviders: RuleMigrationIndexNameProviders,
    currentUser: AuthenticatedUser,
    esScopedClient: IScopedClusterClient,
    logger: Logger,
    spaceId: string,
    dependencies: SiemMigrationsClientDependencies
  ) {
    this.migrations = new RuleMigrationsDataMigrationClient(
      indexNameProviders.migrations,
      currentUser,
      esScopedClient,
      logger,
      dependencies
    );
    this.rules = new RuleMigrationsDataRulesClient(
      indexNameProviders.rules,
      currentUser,
      esScopedClient,
      logger,
      dependencies
    );
    this.resources = new RuleMigrationsDataResourcesClient(
      indexNameProviders.resources,
      currentUser,
      esScopedClient,
      logger,
      dependencies
    );
    this.integrations = new RuleMigrationsDataIntegrationsClient(
      indexNameProviders.integrations,
      currentUser,
      esScopedClient,
      logger,
      dependencies
    );
    this.prebuiltRules = new RuleMigrationsDataPrebuiltRulesClient(
      indexNameProviders.prebuiltrules,
      currentUser,
      esScopedClient,
      logger,
      dependencies
    );
    this.lookups = new RuleMigrationsDataLookupsClient(
      currentUser,
      esScopedClient,
      logger,
      spaceId
    );

    this.logger = logger;
    this.esClient = esScopedClient.asInternalUser;
  }

  /**
   *
   * Deletes a migration and all its associated rules and resources.
   *
   */
  async deleteMigration(migrationId: string) {
    const migrationDeleteOperations = await this.migrations.prepareDelete({
      id: migrationId,
    });

    const rulesByMigrationIdDeleteOperations = await this.rules.prepareDelete(migrationId);

    const resourcesByMigrationIdDeleteOperations = await this.resources.prepareDelete(migrationId);

    return this.esClient
      .bulk({
        refresh: 'wait_for',
        operations: [
          ...migrationDeleteOperations,
          ...rulesByMigrationIdDeleteOperations,
          ...resourcesByMigrationIdDeleteOperations,
        ],
      })
      .then(() => {
        this.logger.info(`Deleted migration ${migrationId}`);
      })
      .catch((error) => {
        this.logger.error(`Error deleting migration ${migrationId}: ${error}`);
        throw error;
      });
  }
}
