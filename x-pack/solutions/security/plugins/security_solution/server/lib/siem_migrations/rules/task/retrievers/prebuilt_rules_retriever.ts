/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationsDataClient } from '../../data/rule_migrations_data_client';
import type { RuleMigrationPrebuiltRule } from '../../types';

export class PrebuiltRulesRetriever {
  constructor(private readonly dataClient: RuleMigrationsDataClient) {}

  public async getRules(
    semanticString: string,
    techniqueIds: string
  ): Promise<RuleMigrationPrebuiltRule[]> {
    return this.prebuiltRulesRetriever(semanticString, techniqueIds);
  }

  private prebuiltRulesRetriever = async (
    semanticString: string,
    techniqueIds: string
  ): Promise<RuleMigrationPrebuiltRule[]> => {
    const rules = await this.dataClient.prebuiltRules.retrieveRules(semanticString, techniqueIds);

    return rules;
  };
}
