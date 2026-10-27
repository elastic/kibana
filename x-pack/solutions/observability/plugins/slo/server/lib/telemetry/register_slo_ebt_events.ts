/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type { SloEbtEventType } from './ebt_event_types';
import { SLO_EBT_EVENT_TYPES } from './ebt_event_types';
import { sloEbtEventTypeOpts } from './ebt_events';

type EventTypeRegistry = Pick<AnalyticsServiceSetup, 'registerEventType'>;

const registerEventType = <EventType extends SloEbtEventType>(
  analytics: EventTypeRegistry,
  eventType: EventType
) => analytics.registerEventType(sloEbtEventTypeOpts[eventType]);

/** Registers every SLO EBT event type with Core analytics. */
export const registerSloEbtEvents = (analytics: EventTypeRegistry): void => {
  SLO_EBT_EVENT_TYPES.forEach((eventType) => registerEventType(analytics, eventType));
};
