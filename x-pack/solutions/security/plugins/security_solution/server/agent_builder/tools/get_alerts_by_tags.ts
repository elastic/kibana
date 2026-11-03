/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERT_WORKFLOW_TAGS } from '@kbn/rule-data-utils';
import { ALERTS_BATCH_MAX_SIZE, ESSENTIAL_ALERT_FIELDS } from '../../../common/constants';

export interface TaggedAlerts {
  /** How many alerts carry any of the tags. */
  total: number;
  /** The most recent of them, at most `ALERTS_BATCH_MAX_SIZE`, with essential fields only. */
  alerts: Array<{ id: string; source: Record<string, unknown> }>;
}

/**
 * Fetches the most recent alerts that carry any of `tags` in `kibana.alert.workflow_tags`, and
 * how many carry them. Alerts in `excludeIds` are left out of both.
 */
export const getAlertsByTags = async ({
  esClient,
  index,
  tags,
  excludeIds = [],
}: {
  esClient: ElasticsearchClient;
  index: string;
  tags: readonly string[];
  excludeIds?: readonly string[];
}): Promise<TaggedAlerts> => {
  if (tags.length === 0) {
    return { total: 0, alerts: [] };
  }

  const response = await esClient.search<Record<string, unknown>>({
    index,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: ALERTS_BATCH_MAX_SIZE,
    track_total_hits: true,
    sort: [{ '@timestamp': { order: 'desc' } }],
    _source: ESSENTIAL_ALERT_FIELDS,
    query: {
      bool: {
        filter: [{ terms: { [ALERT_WORKFLOW_TAGS]: [...tags] } }],
        ...(excludeIds.length > 0 ? { must_not: [{ ids: { values: [...excludeIds] } }] } : {}),
      },
    },
  });

  const { total, hits } = response.hits;
  return {
    total: typeof total === 'number' ? total : total?.value ?? 0,
    alerts: hits.flatMap((hit) =>
      hit._id && hit._source ? [{ id: hit._id, source: hit._source }] : []
    ),
  };
};
