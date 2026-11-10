/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseEsqlQuery } from '@kbn/securitysolution-utils';
import type { MigrationTranslationResult } from '../../../../../../common/siem_migrations/model/common.gen';
import { MigrationTranslationResultEnum } from '../../../../../../common/siem_migrations/model/common.gen';
import type {
  RuleMigrationRule,
  UpdateRuleMigrationRule,
} from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { InternalUpdateRuleMigrationRule } from '../../types';
import {
  getElasticRiskScoreFromElasticSeverity,
  getElasticSeverityFromOriginalRule,
} from '../../task/agent/sub_graphs/translate_rule/nodes/translate_rule/severity';
import type { PrebuiltRulesResults } from './prebuilt_rules';

interface TransformContext {
  prebuiltRules: Record<string, PrebuiltRulesResults>;
  /** Stored state of all migration rules in the update, keyed by migration rule id */
  storedRules: Record<string, Pick<RuleMigrationRule, 'original_rule' | 'elastic_rule'>>;
}

export const isValidEsqlQuery = (esqlQuery: string) => {
  const { errors } = parseEsqlQuery(esqlQuery);

  if (errors.length) {
    return false;
  }

  return true;
};

export const convertEsqlQueryToTranslationResult = (
  esqlQuery: string
): MigrationTranslationResult | undefined => {
  if (esqlQuery === '') {
    return MigrationTranslationResultEnum.untranslatable;
  }
  return isValidEsqlQuery(esqlQuery)
    ? MigrationTranslationResultEnum.full
    : MigrationTranslationResultEnum.partial;
};

export const transformToInternalUpdateRuleMigrationData = async (
  ruleMigration: UpdateRuleMigrationRule,
  { prebuiltRules, storedRules }: TransformContext
): Promise<InternalUpdateRuleMigrationRule> => {
  const { elastic_rule: elasticRuleUpdate } = ruleMigration;
  // Prebuilt match takes precedence. Must use truthiness (not != null) so a `prebuilt_rule_id: null`
  // unmatch falls through to the query branch below.
  if (elasticRuleUpdate?.prebuilt_rule_id) {
    const prebuiltRule = prebuiltRules[elasticRuleUpdate.prebuilt_rule_id];
    if (!prebuiltRule) {
      throw new Error(`Prebuilt rule "${elasticRuleUpdate.prebuilt_rule_id}" not found`);
    }
    const { target, current } = prebuiltRule;
    // Same mapping as the translation graph's match_prebuilt_rule node. The ES|QL
    // query is nulled so a previous custom translation doesn't linger.
    return {
      ...ruleMigration,
      elastic_rule: {
        ...elasticRuleUpdate,
        title: target.name,
        description: target.description,
        prebuilt_rule_id: target.rule_id,
        id: current?.id,
        integration_ids: target.related_integrations.map((i) => i.package),
        severity: target.severity,
        risk_score: target.risk_score,
        query: null,
        query_language: null,
      },
      translation_result: MigrationTranslationResultEnum.full,
    };
  }

  if (!elasticRuleUpdate?.query || elasticRuleUpdate.query == null) {
    // pass through update such as comments
    return {
      ...ruleMigration,
    };
  }

  let updatedElasticRule = elasticRuleUpdate;
  const storedRule = storedRules[ruleMigration.id];

  const severity = await getElasticSeverityFromOriginalRule(storedRule.original_rule);
  updatedElasticRule = {
    ...updatedElasticRule,
    query_language: 'esql',
    title: updatedElasticRule?.title || storedRule.original_rule.title,
    description: updatedElasticRule?.description || storedRule.original_rule.description || '',
    severity,
    risk_score: getElasticRiskScoreFromElasticSeverity(severity),
  };

  return {
    ...ruleMigration,
    elastic_rule: updatedElasticRule,
    translation_result: convertEsqlQueryToTranslationResult(elasticRuleUpdate.query),
  };
};
