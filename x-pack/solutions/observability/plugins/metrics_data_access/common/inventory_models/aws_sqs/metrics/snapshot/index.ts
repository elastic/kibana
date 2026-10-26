/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sqsMessagesVisible } from './sqs_messages_visible';
import { sqsMessagesDelayed } from './sqs_messages_delayed';
import { sqsMessagesEmpty } from './sqs_messages_empty';
import { sqsMessagesSent } from './sqs_messages_sent';
import { sqsOldestMessage } from './sqs_oldest_message';
import type { MetricConfigMap } from '../../../shared/metrics/types';

export const snapshot = {
  sqsMessagesVisible,
  sqsMessagesDelayed,
  sqsMessagesEmpty,
  sqsMessagesSent,
  sqsOldestMessage,
} satisfies MetricConfigMap;

export type SQSAggregations = typeof snapshot;
