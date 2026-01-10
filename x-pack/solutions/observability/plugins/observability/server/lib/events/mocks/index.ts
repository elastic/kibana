/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExternalEventInput, EventSource } from '../../../../common/types/events';
import { PROMETHEUS_MOCKS } from './prometheus';
import { DATADOG_MOCKS } from './datadog';
import { SENTRY_MOCKS } from './sentry';

export const MOCK_EVENTS_BY_PROVIDER: Record<EventSource, ExternalEventInput[]> = {
  prometheus: PROMETHEUS_MOCKS,
  datadog: DATADOG_MOCKS,
  sentry: SENTRY_MOCKS,
  pagerduty: [], // Can be extended later
  custom: [],
};

export function getMockEventsForProvider(provider: EventSource): ExternalEventInput[] {
  return MOCK_EVENTS_BY_PROVIDER[provider] || [];
}

export function getAllMockEvents(): ExternalEventInput[] {
  return Object.values(MOCK_EVENTS_BY_PROVIDER).flat();
}

export { PROMETHEUS_MOCKS, DATADOG_MOCKS, SENTRY_MOCKS };

