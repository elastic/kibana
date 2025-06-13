/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationIntegration } from '../../types';
import type { RuleMigrationsRetrieverClients } from './rule_migrations_retriever';

export class IntegrationRetriever {
  constructor(private readonly clients: RuleMigrationsRetrieverClients) {}

  public async populateIndex() {
    return this.clients.data.integrations.populate();
  }

  public async search(semanticString: string): Promise<RuleMigrationIntegration[]> {
    return this.clients.data.integrations.semanticSearch(semanticString);
  }
}
