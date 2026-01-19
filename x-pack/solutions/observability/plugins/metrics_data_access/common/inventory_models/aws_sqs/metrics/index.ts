/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { awsSQSMessagesVisible } from './tsvb/aws_sqs_messages_visible';
import { awsSQSMessagesDelayed } from './tsvb/aws_sqs_messages_delayed';
import { awsSQSMessagesSent } from './tsvb/aws_sqs_messages_sent';
import { awsSQSMessagesEmpty } from './tsvb/aws_sqs_messages_empty';
import { awsSQSOldestMessage } from './tsvb/aws_sqs_oldest_message';
import { MetricsCatalog } from '../../shared/metrics/metrics_catalog';
import type { SQSAggregations } from './snapshot';
import type { InventoryMetricsConfig } from '../../shared/metrics/types';

export const metrics: InventoryMetricsConfig<SQSAggregations> = {
  tsvb: {
    awsSQSMessagesVisible,
    awsSQSMessagesDelayed,
    awsSQSMessagesSent,
    awsSQSMessagesEmpty,
    awsSQSOldestMessage,
  },
  requiredTsvb: [
    'awsSQSMessagesVisible',
    'awsSQSMessagesDelayed',
    'awsSQSMessagesSent',
    'awsSQSMessagesEmpty',
    'awsSQSOldestMessage',
  ],
  getAggregations: async (args) => {
    const { snapshot } = await import('./snapshot');
    const catalog = new MetricsCatalog(snapshot, args?.schema);
    return catalog;
  },
  getWaffleMapTooltipMetrics: () => [
    'sqsMessagesVisible',
    'sqsMessagesDelayed',
    'sqsMessagesEmpty',
    'sqsMessagesSent',
    'sqsOldestMessage',
  ],
  defaultSnapshot: 'sqsMessagesVisible',
  defaultTimeRangeInSeconds: 14400,
};
