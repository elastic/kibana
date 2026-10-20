/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RootSchema } from '@kbn/core/public';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';

export enum RuleChangesHistoryEventTypes {
  ChangesHistoryViewed = 'Open Rule Changes History',
  ChangesHistoryDiffOpened = 'Open Rule Changes History Diff',
  ChangesHistoryRestoreTriggered = 'Restore Rule From Changes History',
}

interface ReportChangesHistoryDiffOpenedParams {
  isPrebuiltRule: boolean;
}

interface ReportChangesHistoryRestoreTriggeredParams {
  status: 'success' | 'no_change' | 'conflict' | 'error';
  ruleType: RuleResponse['type'] | 'unknown';
  isPrebuilt: boolean;
  isCustomized: boolean;
  isConflictRetry: boolean;
}

export interface RuleChangesHistoryTelemetryEventsMap {
  [RuleChangesHistoryEventTypes.ChangesHistoryViewed]: Record<string, never>;
  [RuleChangesHistoryEventTypes.ChangesHistoryDiffOpened]: ReportChangesHistoryDiffOpenedParams;
  [RuleChangesHistoryEventTypes.ChangesHistoryRestoreTriggered]: ReportChangesHistoryRestoreTriggeredParams;
}

export interface RuleChangesHistoryTelemetryEvent {
  eventType: RuleChangesHistoryEventTypes;
  schema: RootSchema<RuleChangesHistoryTelemetryEventsMap[RuleChangesHistoryEventTypes]>;
}
