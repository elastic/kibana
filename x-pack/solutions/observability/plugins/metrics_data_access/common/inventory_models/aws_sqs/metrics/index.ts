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
import { createInventoryModelMetrics } from '../../shared/create_inventory_model';

export const metrics = createInventoryModelMetrics({
  tsvb: {
    awsSQSMessagesVisible,
    awsSQSMessagesDelayed,
    awsSQSMessagesSent,
    awsSQSMessagesEmpty,
    awsSQSOldestMessage,
  },
  getAggregation: async (aggregation) =>
    await import('./snapshot').then(({ snapshot }) => snapshot[aggregation]),
  getAggregations: async () => await import('./snapshot').then(({ snapshot }) => snapshot),
  defaultSnapshot: 'sqsMessagesVisible',
  defaultTimeRangeInSeconds: 14400,
});
