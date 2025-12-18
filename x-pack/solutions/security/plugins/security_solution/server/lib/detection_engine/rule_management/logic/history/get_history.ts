/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  Page,
  PerPage,
  RuleHistoryResult,
} from '../../../../../../common/api/detection_engine';

export interface GetRuleHistoryOptions {
  client: ElasticsearchClient;
  ruleId: string;
  page: Page | undefined;
  perPage: PerPage | undefined;
}

export interface GetRuleHistoryResponse {
  total: number;
  items: RuleHistoryResult[];
}

interface RawRuleHistoryItem {
  '@timestamp': string;
  changeId: number;
  userId: string;
  snapshotId: string;
  message: string;
  changedFields: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newValues: Record<string, any>;
}

export const getRuleHistory = async ({
  client,
  ruleId,
  perPage = 20,
  page = 1,
}: GetRuleHistoryOptions): Promise<GetRuleHistoryResponse> => {
  const result = await client.search<RawRuleHistoryItem>({
    index: '.kibana_alerting_cases_snapshots_001', // TODO: This needs to be defined centrally
    from: (page - 1) * perPage,
    size: perPage,
    query: {
      match: {
        objectId: `alert:${ruleId}`, // TODO: This needs to be defined elsewhere
      },
    },
    sort: { '@timestamp': 'desc' },
  });

  const items = result.hits.hits.map((item) => {
    const {
      '@timestamp': timestamp,
      message,
      userId,
      snapshotId,
      changedFields = [],
      newValues = {},
    } = item?._source || {};
    return {
      snapshotId,
      timestamp,
      message,
      userId,
      changedFields,
      revision: newValues['alert.revision'],
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { value: total } = result.hits.total as unknown as any;

  return {
    total: total || 0,
    items,
  };
};
