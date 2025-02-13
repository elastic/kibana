/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type {
  RuleResponse,
  RuleSignatureId,
} from '../../../../../../common/api/detection_engine/model/rule_schema';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import { findRules } from '../../../rule_management/logic/search/find_rules';
import { internalRuleToAPIResponse } from '../../../rule_management/logic/detection_rules_client/converters/internal_rule_to_api_response';
import { convertRulesFilterToKQL } from '../../../../../../common/detection_engine/rule_management/rule_filtering';
import type {
  FindRulesSortField,
  PrebuiltRuleFilter,
  SortOrder,
} from '../../../../../../common/api/detection_engine';

interface FetchAllInstalledRulesArgs {
  page?: number;
  perPage?: number;
  filter?: PrebuiltRuleFilter;
  sortField?: FindRulesSortField;
  sortOrder?: SortOrder;
}

export interface IPrebuiltRuleObjectsClient {
  fetchInstalledRules(args?: FetchAllInstalledRulesArgs): Promise<RuleResponse[]>;
  fetchInstalledRulesByIds(ruleIds: string[]): Promise<RuleResponse[]>;
}

export const createPrebuiltRuleObjectsClient = (
  rulesClient: RulesClient
): IPrebuiltRuleObjectsClient => {
  return {
    fetchInstalledRules: ({ page, perPage, sortField, sortOrder, filter } = {}): Promise<
      RuleResponse[]
    > => {
      return withSecuritySpan('IPrebuiltRuleObjectsClient.fetchInstalledRules', async () => {
        const filterKQL = convertRulesFilterToKQL({
          showElasticRules: true,
          filter: filter?.name,
          tags: filter?.tags,
          customizationStatus: filter?.customization_status,
        });

        const rulesData = await findRules({
          rulesClient,
          ruleIds: filter?.rule_ids,
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
    fetchInstalledRulesByIds: (ruleIds: RuleSignatureId[]): Promise<RuleResponse[]> => {
      return withSecuritySpan('IPrebuiltRuleObjectsClient.fetchInstalledRulesByIds', async () => {
        const { data } = await findRules({
          rulesClient,
          perPage: ruleIds.length,
          page: 1,
          sortField: 'createdAt',
          sortOrder: 'desc',
          fields: undefined,
          filter: `alert.attributes.params.ruleId:(${ruleIds.join(' or ')})`,
        });

        const rules = data.map((rule) => internalRuleToAPIResponse(rule));
        return rules;
      });
    },
  };
};
