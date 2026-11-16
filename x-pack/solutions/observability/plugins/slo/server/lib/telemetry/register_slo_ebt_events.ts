/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import {
  sloCreatedEbtEvent,
  sloDeletedEbtEvent,
  sloResetEbtEvent,
  sloUpdatedEbtEvent,
} from './ebt_events';

/** Registers every SLO EBT event type with Core analytics. */
export const registerSloEbtEvents = (
  analytics: Pick<AnalyticsServiceSetup, 'registerEventType'>
): void => {
  analytics.registerEventType(sloCreatedEbtEvent);
  analytics.registerEventType(sloUpdatedEbtEvent);
  analytics.registerEventType(sloDeletedEbtEvent);
  analytics.registerEventType(sloResetEbtEvent);
};
