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

interface RuleMigrationsRetrieverDeps {
  data: RuleMigrationsDataClient;
  rules: RulesClient;
  savedObjects: SavedObjectsClientContract;
}

export class RuleMigrationsRetriever {
  public readonly resources: RuleResourceRetriever;
  public readonly integrations: IntegrationRetriever;
  public readonly prebuiltRules: PrebuiltRulesRetriever;

  constructor(migrationId: string, private readonly clients: RuleMigrationsRetrieverDeps) {
    this.resources = new RuleResourceRetriever(migrationId, this.clients.data);
    this.integrations = new IntegrationRetriever(this.clients.data);
    this.prebuiltRules = new PrebuiltRulesRetriever(this.clients.data);
  }

  public async initialize() {
    await Promise.all([
      this.resources.initialize(),
      // Populates the indices used for RAG searches on prebuilt rules and integrations.
      this.clients.data.prebuiltRules.create({
        rulesClient: this.clients.rules,
        soClient: this.clients.savedObjects,
      }),
      // Will use Fleet API client for integration retrieval as an argument once feature is available
      this.clients.data.integrations.create(),
    ]).catch((error) => {
      throw new Error(`Failed to initialize RuleMigrationsRetriever: ${error}`);
    });
  }
}
