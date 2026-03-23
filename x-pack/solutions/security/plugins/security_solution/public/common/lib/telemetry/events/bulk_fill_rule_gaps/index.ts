/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkFillRuleGapsTelemetryEvent } from './types';
import { BulkFillRuleGapsEventTypes } from './types';

export const bulkFillRuleGapsOpenModalEvent: BulkFillRuleGapsTelemetryEvent = {
  eventType: BulkFillRuleGapsEventTypes.BulkFillRuleGapsOpenModal,
  schema: {
    type: {
      type: 'keyword',
      _meta: {
        description: 'Open fill rule gaps modal (single|bulk)',
        optional: false,
      },
    },
  },
};

export const bulkFillRuleGapsExecuteEvent: BulkFillRuleGapsTelemetryEvent = {
  eventType: BulkFillRuleGapsEventTypes.BulkFillRuleGapsExecute,
  schema: {
    rangeInMs: {
      type: 'integer',
      _meta: {
        description:
          'The time range (expressed in milliseconds) against which the fill rule gaps was executed',
        optional: false,
      },
    },
    status: {
      type: 'keyword',
      _meta: {
        description:
          'Outcome state of the fill rule gaps. Possible values are "success" and "error"',
        optional: false,
      },
    },
    rulesCount: {
      type: 'integer',
      _meta: {
        description: 'Number of rules that were executed in the fill rule gaps',
        optional: false,
      },
    },
  },
};

export const bulkFillRuleGapsTelemetryEvents = [
  bulkFillRuleGapsExecuteEvent,
  bulkFillRuleGapsOpenModalEvent,
];
