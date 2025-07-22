/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TelemetryEvent, TelemetryEventTypes } from './types';

const relatedAlertsLoaded: TelemetryEvent = {
  eventType: TelemetryEventTypes.RELATED_ALERTS_LOADED,
  schema: {
    count: {
      type: 'long',
      _meta: {
        description: 'Number of related alerts loaded.',
        optional: false,
      },
    },
  },
};

const alertDetailsPageView: TelemetryEvent = {
  eventType: TelemetryEventTypes.ALERT_DETAILS_PAGE_VIEW,
  schema: {
    rule_type: {
      type: 'keyword' as const,
      _meta: {
        description: 'Rule type ID of the alert whose details page was viewed',
        optional: false,
      },
    },
  },
};

export const events: TelemetryEvent[] = [relatedAlertsLoaded, alertDetailsPageView];
