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

const caseSelectedFromObservability: TelemetryEvent = {
  eventType: TelemetryEventTypes.CASE_SELECTED_FROM_OBSERVABILITY,
  schema: {
    caseContext: {
      type: 'keyword' as const,
      _meta: {
        description: 'The UI context where the case was selected from',
      },
    },
  },
};

const relatedAlertAddedToCase: TelemetryEvent = {
  eventType: TelemetryEventTypes.RELATED_ALERT_ADDED_TO_CASE,
  schema: {
    new_case_created: {
      type: 'boolean' as const,
      _meta: {
        description: 'Whether a case was created when adding an alert to a case',
      },
    },
  },
};
const linkedDashboardView: TelemetryEvent = {
  eventType: TelemetryEventTypes.LINKED_DASHBOARD_VIEW,
  schema: {
    dashboard_id: {
      type: 'keyword' as const,
      _meta: {
        description: 'ID of the dashboard linked to the alert',
        optional: false,
      },
    },
  },
};

const caseSelectedFromObservability: TelemetryEvent = {
  eventType: TelemetryEventTypes.CASE_SELECTED_FROM_OBSERVABILITY,
  schema: {
    caseContext: {
      type: 'keyword' as const,
      _meta: {
        description: 'The UI context where the case was selected from',
        optional: false,
      },
    },
  },
};

export const events: TelemetryEvent[] = [
  relatedAlertsLoaded,
  alertDetailsPageView,
  caseSelectedFromObservability,
  relatedAlertAddedToCase,
  linkedDashboardView,
  caseSelectedFromObservability,
];
