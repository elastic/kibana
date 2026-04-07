/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';

export enum AiRuleCreationEventTypes {
  SessionStarted = 'AI Rule Creation Session Started',
  AppliedToForm = 'AI Rule Applied to Form',
  RuleCreated = 'AI Rule Created',
  RuleEdited = 'AI Rule Edited',
  RuleCreationError = 'AI Rule Creation Error',
  SessionAbandoned = 'AI Rule Creation Abandoned',
}

export interface ReportSessionStartedParams {
  sessionId: string;
}

export interface ReportAppliedToFormParams {
  sessionId: string;
  ruleType: string;
  threatTechniques: string[];
  durationSinceSessionStartMs: number;
  isRegeneration: boolean;
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
  threatTechniques: string[];
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
  [AiRuleCreationEventTypes.SessionStarted]: ReportSessionStartedParams;
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
