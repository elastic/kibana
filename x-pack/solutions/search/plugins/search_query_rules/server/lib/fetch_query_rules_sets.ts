/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryRulesListRulesetsQueryRulesetListItem } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Page, Paginate } from '../../common/pagination';
import { pageToPagination } from '../../common/pagination';

export const fetchQueryRulesSets = async (
  client: ElasticsearchClient,
  { from, size }: Page
): Promise<Paginate<QueryRulesListRulesetsQueryRulesetListItem>> => {
  const result = await client.queryRules.listRulesets({
    from,
    size,
  });
  const _meta = pageToPagination({ from, size, total: result.count });
  return { _meta, data: result.results };
};
