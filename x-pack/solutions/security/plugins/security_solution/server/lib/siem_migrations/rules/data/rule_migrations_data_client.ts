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
import type { SiemRuleMigrationsClientDependencies } from '../types';
import type { AdapterId } from './rule_migrations_data_service';

export type IndexNameProvider = () => Promise<string>;
export type IndexNameProviders = Record<AdapterId, IndexNameProvider>;

export class RuleMigrationsDataClient {
  public readonly rules: RuleMigrationsDataRulesClient;
  public readonly resources: RuleMigrationsDataResourcesClient;
  public readonly integrations: RuleMigrationsDataIntegrationsClient;
  public readonly prebuiltRules: RuleMigrationsDataPrebuiltRulesClient;
  public readonly lookups: RuleMigrationsDataLookupsClient;
  public readonly spaceId: string;

  constructor(
    indexNameProviders: IndexNameProviders,
    currentUser: AuthenticatedUser,
    esScopedClient: IScopedClusterClient,
    logger: Logger,
    dependencies: SiemRuleMigrationsClientDependencies,
    spaceId: string
  ) {
    this.spaceId = spaceId;
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
  }
}
