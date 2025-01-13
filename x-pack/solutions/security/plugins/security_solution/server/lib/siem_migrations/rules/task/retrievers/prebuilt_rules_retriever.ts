/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationPrebuiltRule } from '../../types';
import type { RuleMigrationsRetrieverClients } from './rule_migrations_retriever';

export class PrebuiltRulesRetriever {
  constructor(private readonly clients: RuleMigrationsRetrieverClients) {}

  // TODO:
  // 1. Implement the `initialize` method to retrieve prebuilt rules and keep them in memory.
  // 2. Improve the `retrieveRules` method to return the real prebuilt rules instead of the ELSER index doc.

  public async populateIndex() {
    return this.clients.data.prebuiltRules.create({
      rulesClient: this.clients.rules,
      soClient: this.clients.savedObjects,
    });
  }

  public async getRules(
    semanticString: string,
    techniqueIds: string
  ): Promise<RuleMigrationPrebuiltRule[]> {
    return this.clients.data.prebuiltRules.retrieveRules(semanticString, techniqueIds);
  }
}
