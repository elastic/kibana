/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SloTelemetryEvent } from './types';
import { SloTelemetryEventTypes } from './types';

const sloDetailsFlyoutTabChangedEventType: SloTelemetryEvent = {
  eventType: SloTelemetryEventTypes.SLO_DETAILS_FLYOUT_TAB_CHANGED,
  schema: {
    tabId: {
      type: 'keyword',
      _meta: { description: 'The tab identifier that was selected' },
    },
  },
};

export const sloTelemetryEventBasedTypes = [sloDetailsFlyoutTabChangedEventType];
