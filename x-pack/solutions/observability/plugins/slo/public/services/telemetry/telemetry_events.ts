/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SloTelemetryEvent } from './types';
import { SloTelemetryEventTypes } from './types';

const sloDetailsFlyoutViewedEventType: SloTelemetryEvent = {
  eventType: SloTelemetryEventTypes.SLO_DETAILS_FLYOUT_VIEWED,
  schema: {},
};

const sloDetailsFlyoutTabChangedEventType: SloTelemetryEvent = {
  eventType: SloTelemetryEventTypes.SLO_DETAILS_FLYOUT_TAB_CHANGED,
  schema: {
    tabId: {
      type: 'keyword',
      _meta: { description: 'The tab identifier that was selected' },
    },
  },
};

const sloCreateFlyoutViewedEventType: SloTelemetryEvent = {
  eventType: SloTelemetryEventTypes.SLO_CREATE_FLYOUT_VIEWED,
  schema: {
    sloType: {
      type: 'pass_through',
      _meta: { description: 'The type of SLO that will be created' },
    },
  },
};

const sloCreatedEventType: SloTelemetryEvent = {
  eventType: SloTelemetryEventTypes.SLO_CREATED,
  schema: {
    slo_id: {
      type: 'keyword',
      _meta: { description: 'The ID of the SLO that was created' },
    },
    template_id: {
      type: 'keyword',
      _meta: {
        description: 'The ID of the SLO template the SLO was created from, if any',
        optional: true,
      },
    },
  },
};

const sloEditedEventType: SloTelemetryEvent = {
  eventType: SloTelemetryEventTypes.SLO_EDITED,
  schema: {
    slo_id: {
      type: 'keyword',
      _meta: { description: 'The ID of the SLO that was edited' },
    },
  },
};

const sloDeletedEventType: SloTelemetryEvent = {
  eventType: SloTelemetryEventTypes.SLO_DELETED,
  schema: {
    slo_id: {
      type: 'keyword',
      _meta: { description: 'The ID of the SLO that was deleted' },
    },
  },
};

const sloClonedEventType: SloTelemetryEvent = {
  eventType: SloTelemetryEventTypes.SLO_CLONED,
  schema: {
    slo_id: {
      type: 'keyword',
      _meta: { description: 'The ID of the SLO that was cloned' },
    },
  },
};

const sloResetEventType: SloTelemetryEvent = {
  eventType: SloTelemetryEventTypes.SLO_RESET,
  schema: {
    slo_id: {
      type: 'keyword',
      _meta: { description: 'The ID of the SLO that was reset' },
    },
  },
};

export const sloTelemetryEventBasedTypes = [
  sloDetailsFlyoutViewedEventType,
  sloDetailsFlyoutTabChangedEventType,
  sloCreateFlyoutViewedEventType,
  sloCreatedEventType,
  sloEditedEventType,
  sloDeletedEventType,
  sloClonedEventType,
  sloResetEventType,
];
