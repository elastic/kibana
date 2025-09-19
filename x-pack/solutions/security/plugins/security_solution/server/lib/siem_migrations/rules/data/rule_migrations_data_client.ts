/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, IScopedClusterClient, Logger } from '@kbn/core/server';
import type {
  RuleMigration,
  RuleMigrationRule,
} from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { RuleMigrationsDataIntegrationsClient } from './rule_migrations_data_integrations_client';
import { RuleMigrationsDataPrebuiltRulesClient } from './rule_migrations_data_prebuilt_rules_client';
import { RuleMigrationsDataRulesClient } from './rule_migrations_data_rules_client';
import { SiemMigrationsDataLookupsClient } from '../../common/data/siem_migrations_data_lookups_client';
import type { RuleMigrationIndexNameProviders } from '../types';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import { RuleMigrationsDataMigrationClient } from './rule_migrations_data_migration_client';
import { SiemMigrationsDataClient } from '../../common/data/siem_migrations_data_client';
import { SiemMigrationsDataResourcesClient } from '../../common/data/siem_migrations_data_resources_client';

export class RuleMigrationsDataClient extends SiemMigrationsDataClient<
  RuleMigration,
  RuleMigrationRule
> {
  public readonly migrations: RuleMigrationsDataMigrationClient;
  public readonly items: RuleMigrationsDataRulesClient;
  public readonly resources: SiemMigrationsDataResourcesClient;
  public readonly integrations: RuleMigrationsDataIntegrationsClient;
  public readonly prebuiltRules: RuleMigrationsDataPrebuiltRulesClient;
  public readonly lookups: SiemMigrationsDataLookupsClient;

  constructor(
    indexNameProviders: RuleMigrationIndexNameProviders,
    currentUser: AuthenticatedUser,
    esScopedClient: IScopedClusterClient,
    logger: Logger,
    spaceId: string,
    dependencies: SiemMigrationsClientDependencies
  ) {
    super(esScopedClient, logger);

    this.migrations = new RuleMigrationsDataMigrationClient(
      indexNameProviders.migrations,
      currentUser,
      esScopedClient,
      logger,
      dependencies
    );
    this.items = new RuleMigrationsDataRulesClient(
      indexNameProviders.rules,
      currentUser,
      esScopedClient,
      logger,
      dependencies
    );
    this.resources = new SiemMigrationsDataResourcesClient(
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
    this.lookups = new SiemMigrationsDataLookupsClient(
      currentUser,
      esScopedClient,
      logger,
      spaceId
    );
  }
}
