/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { ALERT_EVENTS_DATA_STREAM, ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import type { EsClient, KbnClient } from '@kbn/scout-oblt';

export interface SeededInboxEpisode {
  ruleId: string;
  episodeId: string;
}

const RULE_API_HEADERS = {
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
} as const;

/**
 * Creates a disabled alerting v2 rule and one matching `.rule-events` episode
 * so the observability inbox has a row whose flyout can load rule details.
 * Deletes only this suite's rule and documents on cleanup.
 */
export const seedInboxEpisode = async (
  esClient: EsClient,
  kbnClient: KbnClient
): Promise<SeededInboxEpisode> => {
  const name = `obs-alerting-view-details-${randomUUID()}`;
  const episodeId = `obs-alerting-view-details-ep-${randomUUID()}`;

  const { data: rule } = await kbnClient.request<{ id: string }>({
    description: 'create alerting v2 rule for inbox host-aware URL tests',
    method: 'POST',
    path: ALERTING_V2_RULE_API_PATH,
    headers: RULE_API_HEADERS,
    body: {
      kind: 'alert',
      metadata: { name },
      schedule: { every: '1h' },
      query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 1' } },
    },
  });

  const ruleId = rule.id;

  try {
    await kbnClient.request({
      description: 'disable seeded alerting v2 rule',
      method: 'POST',
      path: `${ALERTING_V2_RULE_API_PATH}/${encodeURIComponent(ruleId)}/_disable`,
      headers: RULE_API_HEADERS,
    });

    const now = new Date().toISOString();
    await esClient.bulk({
      operations: [
        { create: { _index: ALERT_EVENTS_DATA_STREAM } },
        {
          '@timestamp': now,
          scheduled_timestamp: now,
          rule: { id: ruleId, version: 1 },
          group_hash: `${ruleId}-group`,
          data: {},
          status: 'breached',
          source: 'scout-test',
          type: 'alert',
          space_id: 'default',
          episode: { id: episodeId, status: 'active' },
        },
      ],
      refresh: true,
    });
  } catch (error) {
    await deleteSeededRule(kbnClient, ruleId);
    throw error;
  }

  return { ruleId, episodeId };
};

export const deleteInboxEpisode = async (
  esClient: EsClient,
  kbnClient: KbnClient,
  { ruleId }: Pick<SeededInboxEpisode, 'ruleId'>
): Promise<void> => {
  await esClient.deleteByQuery(
    {
      index: ALERT_EVENTS_DATA_STREAM,
      query: { term: { 'rule.id': ruleId } },
      refresh: true,
      wait_for_completion: true,
      conflicts: 'proceed',
    },
    { ignore: [404] }
  );
  await deleteSeededRule(kbnClient, ruleId);
};

const deleteSeededRule = async (kbnClient: KbnClient, ruleId: string): Promise<void> => {
  try {
    await kbnClient.request({
      description: 'delete seeded alerting v2 rule',
      method: 'DELETE',
      path: `${ALERTING_V2_RULE_API_PATH}/${encodeURIComponent(ruleId)}`,
      headers: RULE_API_HEADERS,
    });
  } catch {
    // Rule may already be gone after a partial seed or a prior cleanup.
  }
};
