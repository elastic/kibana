/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RootSchema } from '@kbn/core/public';

export enum RuleDeprecationEventTypes {
  DeprecatedRulesCalloutShown = 'Deprecated Rules Callout Shown',
  DeprecatedRulesCalloutDismissed = 'Deprecated Rules Callout Dismissed',
  DeprecatedRulesModalOpened = 'Deprecated Rules Modal Opened',
  DeprecatedRulesModalRuleLinkClicked = 'Deprecated Rules Modal Rule Link Clicked',
  DeprecatedRulesDeleteAllClicked = 'Deprecated Rules Delete All Clicked',
  DeprecatedRuleDeleteClicked = 'Deprecated Rule Delete Clicked',
  DeprecatedRuleDuplicateAndDeleteClicked = 'Deprecated Rule Duplicate And Delete Clicked',
}

interface ReportDeprecatedRulesCountParams {
  count: number;
}

type ReportEmptyParams = Record<string, never>;

export interface RuleDeprecationTelemetryEventsMap {
  [RuleDeprecationEventTypes.DeprecatedRulesCalloutShown]: ReportDeprecatedRulesCountParams;
  [RuleDeprecationEventTypes.DeprecatedRulesCalloutDismissed]: ReportDeprecatedRulesCountParams;
  [RuleDeprecationEventTypes.DeprecatedRulesModalOpened]: ReportDeprecatedRulesCountParams;
  [RuleDeprecationEventTypes.DeprecatedRulesModalRuleLinkClicked]: ReportEmptyParams;
  [RuleDeprecationEventTypes.DeprecatedRulesDeleteAllClicked]: ReportDeprecatedRulesCountParams;
  [RuleDeprecationEventTypes.DeprecatedRuleDeleteClicked]: ReportEmptyParams;
  [RuleDeprecationEventTypes.DeprecatedRuleDuplicateAndDeleteClicked]: ReportEmptyParams;
}

export interface RuleDeprecationTelemetryEvent {
  eventType: RuleDeprecationEventTypes;
  schema: RootSchema<RuleDeprecationTelemetryEventsMap[RuleDeprecationEventTypes]>;
}
