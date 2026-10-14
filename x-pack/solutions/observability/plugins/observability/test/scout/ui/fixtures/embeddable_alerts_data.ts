/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import type { EsClient } from '@kbn/scout-oblt';

// Kibana provisions this write alias at boot, so alerts can be indexed directly
// (mirrors `rule_link_rbac_data.ts`).
const THRESHOLD_ALERTS_INDEX = '.alerts-observability.threshold.alerts-default';

const TAG_PREFIX = 'obs-embeddable-alerts-scout-test';

export interface EmbeddableAlertsIngestResult {
  cleanupTag: string;
}

/**
 * Indexes a single active custom threshold alert (`logs` consumer), readable by
 * both the observability-alerts-only user and the logs user. No rule is created:
 * the alerts table queries alerts-as-data directly.
 */
export const ingestEmbeddableAlert = async ({
  esClient,
  timestamp,
}: {
  esClient: EsClient;
  timestamp: string;
}): Promise<EmbeddableAlertsIngestResult> => {
  const cleanupTag = `${TAG_PREFIX}-${uuidv4()}`;
  const alertUuid = uuidv4();

  const alertDoc = {
    '@timestamp': timestamp,
    'event.action': 'active',
    'event.kind': 'signal',
    'kibana.alert.status': 'active',
    'kibana.alert.workflow_status': 'open',
    'kibana.alert.instance.id': '*',
    'kibana.alert.uuid': alertUuid,
    'kibana.alert.reason': 'Scout embeddable alerts custom threshold alert is active',
    'kibana.alert.rule.category': 'Custom threshold',
    'kibana.alert.rule.consumer': 'logs',
    'kibana.alert.rule.producer': 'observability',
    'kibana.alert.rule.rule_type_id': OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
    'kibana.alert.rule.name': 'Scout embeddable alerts custom threshold rule',
    'kibana.alert.rule.uuid': uuidv4(),
    // Scoped by the panel's `ruleTags` filter, which queries `kibana.alert.rule.tags`.
    'kibana.alert.rule.tags': [cleanupTag],
    'kibana.alert.start': timestamp,
    'kibana.alert.time_range': { gte: timestamp },
    'kibana.space_ids': ['default'],
    'kibana.version': '8.0.0',
    tags: [cleanupTag],
  };

  const bulkResponse = await esClient.bulk({
    operations: [{ create: { _index: THRESHOLD_ALERTS_INDEX, _id: alertUuid } }, alertDoc],
    refresh: 'wait_for',
  });
  if (bulkResponse.errors) {
    const failures = bulkResponse.items
      .filter((item) => item.create?.error)
      .map((item) => item.create!.error!.reason);
    throw new Error(`Failed to ingest embeddable alert document: ${failures.join('; ')}`);
  }

  return { cleanupTag };
};

export const cleanEmbeddableAlert = async ({
  esClient,
  cleanupTag,
}: {
  esClient: EsClient;
  cleanupTag: string;
}): Promise<void> => {
  await esClient
    .deleteByQuery({
      index: '.alerts-observability.*',
      query: { term: { tags: cleanupTag } },
      refresh: true,
      conflicts: 'proceed',
      ignore_unavailable: true,
    })
    .catch(() => {});
};
