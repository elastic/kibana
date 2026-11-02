/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';

export type RuleCreationSource = 'ai' | 'manual';

export enum RuleCreationEventTypes {
  CreationInitialized = 'Rule Creation Initialized',
  AiAppliedToForm = 'AI Rule Applied to Form',
  RuleCreated = 'Rule Created',
  RuleEdited = 'Rule Edited',
  RuleCreationError = 'Rule Creation Error',
  CreationAbandoned = 'Rule Creation Abandoned',
}

export interface ReportCreationInitializedParams {
  creationSource: RuleCreationSource;
  sessionId: string;
}

export interface ReportAiAppliedToFormParams {
  ruleType: string;
  sessionId: string;
  durationSinceSessionStartMs: number;
}

export interface ReportRuleCreatedParams {
  creationSource: RuleCreationSource;
  sessionId: string;
  ruleType: string;
  enabled: boolean;
  numberOfAiEdits: number;
  threatTechniques: string[];
  durationSinceSessionStartMs: number;
}

export interface ReportRuleEditedParams {
  creationSource: RuleCreationSource;
  sessionId: string;
  ruleType: string;
  enabled: boolean;
  numberOfAiEdits: number;
  durationSinceSessionStartMs: number;
}

export interface ReportRuleCreationErrorParams {
  creationSource: RuleCreationSource;
  sessionId: string;
  ruleType: string;
  errorMessage: string;
  numberOfAiEdits: number;
  durationSinceSessionStartMs: number;
}

export interface ReportCreationAbandonedParams {
  creationSource: RuleCreationSource;
  sessionId: string;
  ruleType: string;
  numberOfAiEdits: number;
  durationSinceSessionStartMs: number;
}

export interface RuleCreationTelemetryEventsMap {
  [RuleCreationEventTypes.CreationInitialized]: ReportCreationInitializedParams;
  [RuleCreationEventTypes.AiAppliedToForm]: ReportAiAppliedToFormParams;
  [RuleCreationEventTypes.RuleCreated]: ReportRuleCreatedParams;
  [RuleCreationEventTypes.RuleEdited]: ReportRuleEditedParams;
  [RuleCreationEventTypes.RuleCreationError]: ReportRuleCreationErrorParams;
  [RuleCreationEventTypes.CreationAbandoned]: ReportCreationAbandonedParams;
}

export interface RuleCreationTelemetryEvent {
  eventType: RuleCreationEventTypes;
  schema: RootSchema<RuleCreationTelemetryEventsMap[RuleCreationEventTypes]>;
}
