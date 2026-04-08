/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';

export enum AiRuleCreationEventTypes {
  CreationInitialized = 'AI Rule Creation Initialized',
  AppliedToForm = 'AI Rule Applied to Form',
  RuleCreated = 'AI Rule Created',
  RuleEdited = 'AI Rule Edited',
  RuleCreationError = 'AI Rule Creation Error',
  SessionAbandoned = 'AI Rule Creation Abandoned',
}

export interface ReportCreationInitializedParams {
  sessionId: string;
}

export interface ReportAppliedToFormParams {
  ruleType: string;
  numberOfEdits: number;
  sessionId?: string;
  durationSinceSessionStartMs?: number;
}

export interface ReportRuleCreatedParams {
  sessionId: string;
  ruleType: string;
  enabled: boolean;
  threatTechniques: string[];
  durationSinceSessionStartMs: number;
}

export interface ReportRuleEditedParams {
  ruleType: string;
  enabled: boolean;
}

export interface ReportRuleCreationErrorParams {
  sessionId: string;
  ruleType: string;
  errorMessage: string;
}

export interface ReportSessionAbandonedParams {
  sessionId: string;
  ruleType: string;
  durationSinceSessionStartMs: number;
}

export interface AiRuleCreationTelemetryEventsMap {
  [AiRuleCreationEventTypes.CreationInitialized]: ReportCreationInitializedParams;
  [AiRuleCreationEventTypes.AppliedToForm]: ReportAppliedToFormParams;
  [AiRuleCreationEventTypes.RuleCreated]: ReportRuleCreatedParams;
  [AiRuleCreationEventTypes.RuleEdited]: ReportRuleEditedParams;
  [AiRuleCreationEventTypes.RuleCreationError]: ReportRuleCreationErrorParams;
  [AiRuleCreationEventTypes.SessionAbandoned]: ReportSessionAbandonedParams;
}

export interface AiRuleCreationTelemetryEvent {
  eventType: AiRuleCreationEventTypes;
  schema: RootSchema<AiRuleCreationTelemetryEventsMap[AiRuleCreationEventTypes]>;
}
