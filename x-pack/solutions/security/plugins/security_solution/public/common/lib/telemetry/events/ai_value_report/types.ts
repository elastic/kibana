/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RootSchema } from '@kbn/core/public';

export enum AIValueReportEventTypes {
  AIValueReportExportExecution = 'AI Value Report Export Execution',
  AIValueReportExportError = 'AI Value Report Export Error',
  AIValueReportExportInsightVerified = 'AI Value Report Export Insight Regenerated',
}

interface ReportAIValueReportExportErrorParams {
  errorMessage: string;
  isExportMode: boolean;
}

interface ReportAIValueReportExportInsightVerifiedParams {
  shouldRegenerate: boolean;
}

export interface AIValueReportTelemetryEventsMap {
  [AIValueReportEventTypes.AIValueReportExportExecution]: {};
  [AIValueReportEventTypes.AIValueReportExportError]: ReportAIValueReportExportErrorParams;
  [AIValueReportEventTypes.AIValueReportExportInsightVerified]: ReportAIValueReportExportInsightVerifiedParams;
}

export interface AIValueReportTelemetryEvent {
  eventType: AIValueReportEventTypes;
  schema: RootSchema<AIValueReportTelemetryEventsMap[AIValueReportEventTypes]>;
}
