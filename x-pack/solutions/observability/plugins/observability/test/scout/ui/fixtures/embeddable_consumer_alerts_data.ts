/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { EsClient } from '@kbn/scout-oblt';

const STACK_ALERTS_INDEX = '.alerts-stack.alerts-default';
const TAG_PREFIX = 'obs-embeddable-consumer-vis-scout-test';

export const CONSUMER_VISIBILITY_CONSUMERS = ['alerts', 'logs', 'stackAlerts'] as const;
export type ConsumerVisibilityConsumer = (typeof CONSUMER_VISIBILITY_CONSUMERS)[number];

export interface ConsumerVisibilityAlert {
  consumer: ConsumerVisibilityConsumer;
  tag: string;
}

export interface ConsumerVisibilityAlertsState {
  alerts: ConsumerVisibilityAlert[];
}

const buildAlertDoc = ({
  consumer,
  tag,
  timestamp,
}: {
  consumer: ConsumerVisibilityConsumer;
  tag: string;
  timestamp: string;
}) => {
  const alertUuid = uuidv4();
  const ruleUuid = uuidv4();

  return {
    id: alertUuid,
    doc: {
      '@timestamp': timestamp,
      'event.action': 'active',
      'event.kind': 'signal',
      'kibana.alert.status': 'active',
      'kibana.alert.workflow_status': 'open',
      'kibana.alert.instance.id': '*',
      'kibana.alert.uuid': alertUuid,
      'kibana.alert.reason': `Scout embeddable consumer visibility es-query (${consumer})`,
      'kibana.alert.rule.category': 'Elasticsearch query',
      'kibana.alert.rule.consumer': consumer,
      'kibana.alert.rule.producer': 'stackAlerts',
      'kibana.alert.rule.rule_type_id': '.es-query',
      'kibana.alert.rule.name': `Scout es-query consumer visibility (${consumer})`,
      'kibana.alert.rule.uuid': ruleUuid,
      'kibana.alert.start': timestamp,
      'kibana.alert.time_range': { gte: timestamp },
      'kibana.space_ids': ['default'],
      'kibana.version': '8.0.0',
      'kibana.alert.rule.tags': [tag],
    },
  };
};

export const ingestConsumerVisibilityAlerts = async ({
  esClient,
  timestamp,
}: {
  esClient: EsClient;
  timestamp: string;
}): Promise<ConsumerVisibilityAlertsState> => {
  const alerts: ConsumerVisibilityAlert[] = [];
  const operations: Array<Record<string, unknown>> = [];

  for (const consumer of CONSUMER_VISIBILITY_CONSUMERS) {
    const tag = `${TAG_PREFIX}-${consumer}-${uuidv4()}`;
    const { id, doc } = buildAlertDoc({ consumer, tag, timestamp });
    operations.push({ create: { _index: STACK_ALERTS_INDEX, _id: id } }, doc);
    alerts.push({ consumer, tag });
  }

  const bulkResponse = await esClient.bulk({
    operations,
    refresh: 'wait_for',
  });
  if (bulkResponse.errors) {
    const failures = bulkResponse.items
      .filter((item) => item.create?.error)
      .map((item) => item.create!.error!.reason);
    throw new Error(`Failed to ingest consumer visibility alert documents: ${failures.join('; ')}`);
  }

  return { alerts };
};

export const cleanConsumerVisibilityAlerts = async ({
  esClient,
  alerts,
}: {
  esClient: EsClient;
  alerts: ConsumerVisibilityAlert[];
}): Promise<void> => {
  await Promise.all(
    alerts.map(({ tag }) =>
      esClient
        .deleteByQuery({
          index: '.alerts-stack.*',
          query: { term: { 'kibana.alert.rule.tags': tag } },
          refresh: true,
          conflicts: 'proceed',
          ignore_unavailable: true,
        })
        .catch(() => {})
    )
  );
};
