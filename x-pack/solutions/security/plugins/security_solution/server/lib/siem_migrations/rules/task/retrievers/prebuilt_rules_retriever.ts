/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrebuildRuleVersionsMap } from '../../data/rule_migrations_data_prebuilt_rules_client';
import type { RuleSemanticSearchResult } from '../../types';
import type { RuleMigrationsRetrieverClients } from './rule_migrations_retriever';

export class PrebuiltRulesRetriever {
  private rulesMap?: PrebuildRuleVersionsMap;

  constructor(private readonly clients: RuleMigrationsRetrieverClients) {}

  public async populateIndex() {
    if (!this.rulesMap) {
      this.rulesMap = await this.clients.data.prebuiltRules.getRuleVersionsMap();
    }
    return this.clients.data.prebuiltRules.populate(this.rulesMap);
  }

  public async search(
    semanticString: string,
    techniqueIds: string
  ): Promise<RuleSemanticSearchResult[]> {
    if (!this.rulesMap) {
      this.rulesMap = await this.clients.data.prebuiltRules.getRuleVersionsMap();
    }
    const results = await this.clients.data.prebuiltRules.search(semanticString, techniqueIds);
    return results.map((rule) => {
      const versions = this.rulesMap?.get(rule.rule_id) ?? {};
      return { ...rule, ...versions };
    });
  }
}
