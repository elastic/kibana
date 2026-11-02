/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleChangesHistoryTelemetryEvent } from './types';
import { RuleChangesHistoryEventTypes } from './types';

export const changesHistoryViewedEvent: RuleChangesHistoryTelemetryEvent = {
  eventType: RuleChangesHistoryEventTypes.ChangesHistoryViewed,
  schema: {},
};

export const changesHistoryDiffOpenedEvent: RuleChangesHistoryTelemetryEvent = {
  eventType: RuleChangesHistoryEventTypes.ChangesHistoryDiffOpened,
  schema: {
    isPrebuiltRule: {
      type: 'boolean',
      _meta: {
        description:
          'Whether the rule whose historical diff was opened is a prebuilt (Elastic) rule',
        optional: false,
      },
    },
  },
};

export const changesHistoryRestoreTriggeredEvent: RuleChangesHistoryTelemetryEvent = {
  eventType: RuleChangesHistoryEventTypes.ChangesHistoryRestoreTriggered,
  schema: {
    status: {
      type: 'keyword',
      _meta: {
        description: 'Outcome of the restore action: success, no_change, conflict, or error',
        optional: false,
      },
    },
    ruleType: {
      type: 'keyword',
      _meta: {
        description: 'Type of the restored rule, e.g. query, eql, esql, threshold',
        optional: false,
      },
    },
    isPrebuilt: {
      type: 'boolean',
      _meta: {
        description: 'Whether the restored rule is a prebuilt (Elastic) rule',
        optional: false,
      },
    },
    isCustomized: {
      type: 'boolean',
      _meta: {
        description: 'Whether the restored rule is a customized prebuilt rule',
        optional: false,
      },
    },
    isConflictRetry: {
      type: 'boolean',
      _meta: {
        description: 'Whether this restore attempt followed a 409 conflict retry',
        optional: false,
      },
    },
  },
};

export const ruleChangesHistoryTelemetryEvents = [
  changesHistoryViewedEvent,
  changesHistoryDiffOpenedEvent,
  changesHistoryRestoreTriggeredEvent,
];
