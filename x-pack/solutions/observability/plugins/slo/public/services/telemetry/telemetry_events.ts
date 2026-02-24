/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SloTelemetryEvent } from './types';
import { SloTelemetryEventTypes } from './types';

const locationSchema = {
  type: 'keyword' as const,
  _meta: { description: 'Where the flyout was opened from' },
};

const sloIdSchema = {
  type: 'keyword' as const,
  _meta: { description: 'The SLO identifier' },
};

const sloDetailsFlyoutViewedEventType: SloTelemetryEvent = {
  eventType: SloTelemetryEventTypes.SLO_DETAILS_FLYOUT_VIEWED,
  schema: {
    location: locationSchema,
    sloId: sloIdSchema,
  },
};

const sloDetailsFlyoutTabChangedEventType: SloTelemetryEvent = {
  eventType: SloTelemetryEventTypes.SLO_DETAILS_FLYOUT_TAB_CHANGED,
  schema: {
    location: locationSchema,
    sloId: sloIdSchema,
    tabId: {
      type: 'keyword',
      _meta: { description: 'The tab identifier that was selected' },
    },
  },
};

const sloDetailsFlyoutOpenInAppClickedEventType: SloTelemetryEvent = {
  eventType: SloTelemetryEventTypes.SLO_DETAILS_FLYOUT_OPEN_IN_APP_CLICKED,
  schema: {
    location: locationSchema,
    sloId: sloIdSchema,
  },
};

const sloCreateFlyoutViewedEventType: SloTelemetryEvent = {
  eventType: SloTelemetryEventTypes.SLO_CREATE_FLYOUT_VIEWED,
  schema: {
    location: locationSchema,
  },
};

export const sloTelemetryEventBasedTypes = [
  sloDetailsFlyoutViewedEventType,
  sloDetailsFlyoutTabChangedEventType,
  sloDetailsFlyoutOpenInAppClickedEventType,
  sloCreateFlyoutViewedEventType,
];
