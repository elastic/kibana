/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type {
  RuleObjectId,
  RuleResponse,
  RuleSignatureId,
  RuleTagArray,
  RuleVersion,
} from '../../../../../../common/api/detection_engine/model/rule_schema';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import { findRules } from '../../../rule_management/logic/search/find_rules';
import { internalRuleToAPIResponse } from '../../../rule_management/logic/detection_rules_client/converters/internal_rule_to_api_response';
import { convertRulesFilterToKQL } from '../../../../../../common/detection_engine/rule_management/rule_filtering';
import type {
  FindRulesSortField,
  PrebuiltRulesFilter,
  SortOrder,
} from '../../../../../../common/api/detection_engine';
import { MAX_PREBUILT_RULES_COUNT } from '../../../rule_management/logic/search/get_existing_prepackaged_rules';

interface FetchAllInstalledRulesArgs {
  page?: number;
  perPage?: number;
  filter?: PrebuiltRulesFilter;
  sortField?: FindRulesSortField;
  sortOrder?: SortOrder;
}

interface FetchAllInstalledRuleVersionsArgs {
  filter?: PrebuiltRulesFilter;
  sortField?: FindRulesSortField;
  sortOrder?: SortOrder;
}

interface FetchInstalledRuleVersionsByIdsArgs {
  ruleIds: RuleSignatureId[];
  sortField?: FindRulesSortField;
  sortOrder?: SortOrder;
}

interface FetchInstalledRulesByIdsArgs {
  ruleIds: RuleSignatureId[];
  sortField?: FindRulesSortField;
  sortOrder?: SortOrder;
}

export interface RuleSummary {
  id: RuleObjectId;
  rule_id: RuleSignatureId;
  version: RuleVersion;
  tags: RuleTagArray;
}

export interface IPrebuiltRuleObjectsClient {
  fetchInstalledRulesByIds(args: FetchInstalledRulesByIdsArgs): Promise<RuleResponse[]>;
  fetchInstalledRules(args?: FetchAllInstalledRulesArgs): Promise<RuleResponse[]>;
  fetchInstalledRuleVersionsByIds(
    args: FetchInstalledRuleVersionsByIdsArgs
  ): Promise<RuleSummary[]>;
  fetchInstalledRuleVersions(args?: FetchAllInstalledRuleVersionsArgs): Promise<RuleSummary[]>;
}

export const createPrebuiltRuleObjectsClient = (
  rulesClient: RulesClient
): IPrebuiltRuleObjectsClient => {
  return {
    fetchInstalledRulesByIds: ({ ruleIds, sortField = 'createdAt', sortOrder = 'desc' }) => {
      return withSecuritySpan('IPrebuiltRuleObjectsClient.fetchInstalledRulesByIds', async () => {
        if (ruleIds.length === 0) {
          return [];
        }

        const { data } = await findRules({
          rulesClient,
          perPage: ruleIds.length,
          page: 1,
          sortField,
          sortOrder,
          fields: undefined,
          filter: `alert.attributes.params.ruleId:(${ruleIds.join(' or ')})`,
        });

        const rules = data.map((rule) => internalRuleToAPIResponse(rule));
        return rules;
      });
    },
    fetchInstalledRules: ({ page, perPage, sortField, sortOrder, filter } = {}) => {
      return withSecuritySpan('IPrebuiltRuleObjectsClient.fetchInstalledRules', async () => {
        const filterKQL = convertRulesFilterToKQL({
          showElasticRules: true,
          filter: filter?.name,
          tags: filter?.tags,
          customizationStatus: filter?.customization_status,
        });

        const rulesData = await findRules({
          rulesClient,
          filter: filterKQL,
          perPage,
          page,
          sortField,
          sortOrder,
          fields: undefined,
        });
        const rules = rulesData.data.map((rule) => internalRuleToAPIResponse(rule));
        return rules;
      });
    },
    fetchInstalledRuleVersionsByIds: ({ ruleIds, sortField, sortOrder }) => {
      return withSecuritySpan(
        'IPrebuiltRuleObjectsClient.fetchInstalledRuleVersionsByIds',
        async () => {
          const filterKQL = convertRulesFilterToKQL({
            showElasticRules: true,
          });

          const rulesData = await findRules({
            rulesClient,
            ruleIds,
            filter: filterKQL,
            perPage: MAX_PREBUILT_RULES_COUNT,
            page: 1,
            sortField,
            sortOrder,
            fields: ['params.ruleId', 'params.version', 'tags'],
          });
          return rulesData.data.map((rule) => ({
            id: rule.id,
            rule_id: rule.params.ruleId,
            version: rule.params.version,
            tags: rule.tags,
          }));
        }
      );
    },
    fetchInstalledRuleVersions: ({ filter, sortField, sortOrder } = {}) => {
      return withSecuritySpan('IPrebuiltRuleObjectsClient.fetchInstalledRuleVersions', async () => {
        const filterKQL = convertRulesFilterToKQL({
          showElasticRules: true,
          filter: filter?.name,
          tags: filter?.tags,
          customizationStatus: filter?.customization_status,
        });

        const rulesData = await findRules({
          rulesClient,
          filter: filterKQL,
          perPage: MAX_PREBUILT_RULES_COUNT,
          page: 1,
          sortField,
          sortOrder,
          fields: ['params.ruleId', 'params.version', 'tags'],
        });
        return rulesData.data.map((rule) => ({
          id: rule.id,
          rule_id: rule.params.ruleId,
          version: rule.params.version,
          tags: rule.tags,
        }));
      });
    },
  };
};
