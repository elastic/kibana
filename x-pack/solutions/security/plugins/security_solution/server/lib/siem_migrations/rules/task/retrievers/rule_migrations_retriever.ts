/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { RuleMigrationsDataClient } from '../../data/rule_migrations_data_client';
import { IntegrationRetriever } from './integration_retriever';
import { PrebuiltRulesRetriever } from './prebuilt_rules_retriever';
import { RuleResourceRetriever } from './rule_resource_retriever';

export interface RuleMigrationsRetrieverClients {
  data: RuleMigrationsDataClient;
  rules: RulesClient;
  savedObjects: SavedObjectsClientContract;
}

/**
 * RuleMigrationsRetriever is a class that is responsible for retrieving all the necessary data during the rule migration process.
 * It is composed of multiple retrievers that are responsible for retrieving specific types of data.
 * Such as rule integrations, prebuilt rules, and rule resources.
 */
export class RuleMigrationsRetriever {
  public readonly resources: RuleResourceRetriever;
  public readonly integrations: IntegrationRetriever;
  public readonly prebuiltRules: PrebuiltRulesRetriever;

  constructor(migrationId: string, clients: RuleMigrationsRetrieverClients) {
    this.resources = new RuleResourceRetriever(migrationId, clients.data);
    this.integrations = new IntegrationRetriever(clients);
    this.prebuiltRules = new PrebuiltRulesRetriever(clients);
  }

  public async initialize() {
    await Promise.all([
      this.resources.initialize(),
      this.prebuiltRules.populateIndex(),
      this.integrations.populateIndex(),
    ]).catch((error) => {
      throw new Error(`Failed to initialize RuleMigrationsRetriever: ${error}`);
    });
  }
}
