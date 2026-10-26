/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { TriggerEmitter } from '../../../workflows/triggers/emit';
import { RuleEventsClient } from './rule_events_client';

/**
 * A `RuleEventsClient` whose reads are the given mocks and whose other methods, `createEvent`,
 * `updateEvent` and `updateEventStatus` included, are the real implementation running on top of
 * those reads and the given writer.
 */
export const asRuleEventsClient = (
  reads: object,
  writer: {
    getAlertEventsClient?: () => Promise<AlertEventsClientApi>;
    emitTrigger?: TriggerEmitter;
  } = {}
): RuleEventsClient =>
  Object.assign(Object.create(RuleEventsClient.prototype), reads, { clients: writer });
