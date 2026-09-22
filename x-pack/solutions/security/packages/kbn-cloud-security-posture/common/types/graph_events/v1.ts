/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  eventsRequestSchema,
  eventsResponseSchema,
  eventOrAlertItemSchema,
} from '../../schema/graph_events/v1';

export type EventsRequest = TypeOf<typeof eventsRequestSchema>;
export type EventsResponse = TypeOf<ReturnType<typeof eventsResponseSchema>>;
export type EventOrAlertItem = TypeOf<typeof eventOrAlertItemSchema>;

// Specific event/alert types (discriminated by isAlert)
export type EventItem = EventOrAlertItem & { isAlert: false };
export type AlertItem = EventOrAlertItem & { isAlert: true };
