/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIValueReportTelemetryEvent } from './types';
import { AIValueReportEventTypes } from './types';

export const AIValueReportExportExecutionEvent: AIValueReportTelemetryEvent = {
  eventType: AIValueReportEventTypes.AIValueReportExportExecution,
  schema: {},
};

export const aiValueReportExportErrorEvent: AIValueReportTelemetryEvent = {
  eventType: AIValueReportEventTypes.AIValueReportExportError,
  schema: {
    errorMessage: {
      type: 'text',
      _meta: {
        description: 'The error message that occurs while exporting the AI Value Report',
        optional: false,
      },
    },
    isExportMode: {
      type: 'boolean',
      _meta: {
        description: 'Flag indicating if the error occurs in export mode',
        optional: false,
      },
    },
  },
};

export const aiValueReportExportInsightVerifiedEvent: AIValueReportTelemetryEvent = {
  eventType: AIValueReportEventTypes.AIValueReportExportInsightVerified,
  schema: {
    shouldRegenerate: {
      type: 'boolean',
      _meta: {
        description:
          'Flag indicating if the insight received as parameter in the export should be regenerated',
        optional: false,
      },
    },
  },
};

export const aiValueReportTelemetryEvents = [
  aiValueReportExportErrorEvent,
  AIValueReportExportExecutionEvent,
  aiValueReportExportInsightVerifiedEvent,
];
