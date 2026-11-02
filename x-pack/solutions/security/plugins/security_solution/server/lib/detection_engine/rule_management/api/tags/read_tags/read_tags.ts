/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleTagsAggregationResult } from '@kbn/alerting-plugin/common';
import {
  getRuleTagsAggregation,
  formatRuleTagsAggregationResult,
} from '@kbn/alerting-plugin/common';
import { enrichFilterWithRuleTypeMapping } from '../../../logic/search/enrich_filter_with_rule_type_mappings';
import { EXPECTED_MAX_TAGS } from '../../../constants';

export const readTags = async ({
  rulesClient,
}: {
  rulesClient: RulesClient;
  perPage?: number;
}): Promise<string[]> => {
  const res = await rulesClient.aggregate<RuleTagsAggregationResult>({
    options: {
      filter: enrichFilterWithRuleTypeMapping(undefined),
    },
    aggs: getRuleTagsAggregation({
      // This is the max limit on the number of tags. In fact it can exceed this number and will be truncated to the hardcoded number.
      maxTags: EXPECTED_MAX_TAGS,
    }),
  });

  return formatRuleTagsAggregationResult(res).ruleTags;
};
