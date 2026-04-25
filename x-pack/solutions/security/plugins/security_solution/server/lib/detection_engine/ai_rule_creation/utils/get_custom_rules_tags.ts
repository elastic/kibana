/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RulesClient } from '@kbn/alerting-plugin/server';

import { convertRulesFilterToKQL } from '../../../../../common/detection_engine/rule_management/rule_filtering';
import { findRules } from '../../rule_management/logic/search/find_rules';

export const getCustomRulesTags = async ({
  rulesClient,
}: {
  rulesClient: RulesClient;
}): Promise<string[]> => {
  const filterKQL = convertRulesFilterToKQL({
    showCustomRules: true,
  });

  const rulesData = await findRules({
    rulesClient,
    filter: filterKQL,
    perPage: 1000,
    page: 1,
    sortField: undefined,
    sortOrder: undefined,
    fields: ['tags'],
  });

  const tagsSet = new Set<string>(rulesData.data.flatMap((rule) => rule.tags));

  return Array.from(tagsSet);
};
