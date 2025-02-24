/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleVersions } from '../../../detection_engine/prebuilt_rules/logic/diff/calculate_rule_diff';
import { createPrebuiltRuleAssetsClient } from '../../../detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../../detection_engine/prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client';
import { fetchRuleVersionsTriad } from '../../../detection_engine/prebuilt_rules/logic/rule_versions/fetch_rule_versions_triad';
import type { RuleMigrationPrebuiltRule } from '../types';
import { RuleMigrationsDataBaseClient } from './rule_migrations_data_base_client';

export type { RuleVersions };
export type PrebuildRuleVersionsMap = Map<string, RuleVersions>;
/* The minimum score required for a prebuilt rule to be considered correct */
const MIN_SCORE = 40 as const;
/* The number of prebuilt rules the RAG will return, sorted by score */
const RETURNED_RULES = 5 as const;

/* BULK_MAX_SIZE defines the number to break down the bulk operations by.
 * The 500 number was chosen as a reasonable number to avoid large payloads. It can be adjusted if needed.
 */
const BULK_MAX_SIZE = 500 as const;

export class RuleMigrationsDataPrebuiltRulesClient extends RuleMigrationsDataBaseClient {
  async getRuleVersionsMap(): Promise<PrebuildRuleVersionsMap> {
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(this.dependencies.savedObjectsClient);
    const ruleObjectsClient = createPrebuiltRuleObjectsClient(this.dependencies.rulesClient);
    return fetchRuleVersionsTriad({ ruleAssetsClient, ruleObjectsClient });
  }

  /** Indexes an array of prebuilt rules to be used with ELSER semantic search queries */
  async populate(ruleVersionsMap: PrebuildRuleVersionsMap): Promise<void> {
    const filteredRules: RuleMigrationPrebuiltRule[] = [];

    ruleVersionsMap.forEach((ruleVersions) => {
      const rule = ruleVersions.target;
      if (rule) {
        const mitreAttackIds = rule?.threat?.flatMap(
          ({ technique }) => technique?.map(({ id }) => id) ?? []
        );

        filteredRules.push({
          rule_id: rule.rule_id,
          name: rule.name,
          description: rule.description,
          elser_embedding: `${rule.name} - ${rule.description}`,
          ...(mitreAttackIds?.length && { mitre_attack_ids: mitreAttackIds }),
        });
      }
    });

    const index = await this.getIndexName();
    const createdAt = new Date().toISOString();
    let prebuiltRuleSlice: RuleMigrationPrebuiltRule[];
    while ((prebuiltRuleSlice = filteredRules.splice(0, BULK_MAX_SIZE)).length) {
      await this.esClient
        .bulk(
          {
            refresh: 'wait_for',
            operations: prebuiltRuleSlice.flatMap((prebuiltRule) => [
              { update: { _index: index, _id: prebuiltRule.rule_id } },
              {
                doc: {
                  ...prebuiltRule,
                  '@timestamp': createdAt,
                },
                doc_as_upsert: true,
              },
            ]),
          },
          { requestTimeout: 10 * 60 * 1000 }
        )
        .catch((error) => {
          this.logger.error(`Error preparing prebuilt rules for SIEM migration: ${error.message}`);
          throw error;
        });
    }
  }

  /** Based on a LLM generated semantic string, returns the 5 best results with a score above 40 */
  async search(semanticString: string, techniqueIds: string): Promise<RuleMigrationPrebuiltRule[]> {
    const index = await this.getIndexName();
    const query = {
      bool: {
        should: [
          {
            semantic: {
              query: semanticString,
              field: 'elser_embedding',
              boost: 1.5,
            },
          },
          {
            multi_match: {
              query: semanticString,
              fields: ['name^2', 'description'],
              boost: 3,
            },
          },
          {
            multi_match: {
              query: techniqueIds,
              fields: ['mitre_attack_ids'],
              boost: 2,
            },
          },
        ],
      },
    };
    const results = await this.esClient
      .search<RuleMigrationPrebuiltRule>({
        index,
        query,
        size: RETURNED_RULES,
        min_score: MIN_SCORE,
      })
      .then((response) => this.processResponseHits(response))
      .catch((error) => {
        this.logger.error(`Error querying prebuilt rule details for ELSER: ${error.message}`);
        throw error;
      });

    return results;
  }
}
