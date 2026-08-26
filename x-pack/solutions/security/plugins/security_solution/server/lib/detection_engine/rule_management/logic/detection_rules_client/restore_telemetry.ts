/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { isCustomizedPrebuiltRule } from '../../../../../../common/api/detection_engine/model/rule_schema/utils';
import {
  DETECTION_RULE_RESTORE_EVENT,
  DETECTION_RULE_RESTORE_ERROR_EVENT,
} from '../../../../telemetry/event_based/events';

export interface RuleRestoreTelemetry {
  ruleId: string;
  ruleType: RuleResponse['type'];
  isPrebuilt: boolean;
  isCustomized: boolean;
  restoredRevisionTimestamp: string;
}

export interface RuleRestoreErrorTelemetry {
  ruleId: string;
  changeId: string;
  status: 'conflict' | 'error';
  errorMessage: string;
}

export function sendRuleRestoreTelemetryEvent(
  analytics: AnalyticsServiceSetup,
  params: { rule: RuleResponse; restoredRevisionTimestamp: string },
  logger?: Logger
): void {
  try {
    const event = createRuleRestoreTelemetryEvent(params);
    analytics.reportEvent(DETECTION_RULE_RESTORE_EVENT.eventType, event);
  } catch (e) {
    // we don't want telemetry errors to impact the main flow
    logger?.debug('Failed to send detection rule restore telemetry', e);
  }
}

export function sendRuleRestoreErrorTelemetryEvent(
  analytics: AnalyticsServiceSetup,
  params: RuleRestoreErrorTelemetry,
  logger?: Logger
): void {
  try {
    analytics.reportEvent(DETECTION_RULE_RESTORE_ERROR_EVENT.eventType, params);
  } catch (e) {
    // we don't want telemetry errors to impact the main flow
    logger?.debug('Failed to send detection rule restore error telemetry', e);
  }
}

function createRuleRestoreTelemetryEvent({
  rule,
  restoredRevisionTimestamp,
}: {
  rule: RuleResponse;
  restoredRevisionTimestamp: string;
}): RuleRestoreTelemetry {
  return {
    ruleId: rule.id,
    ruleType: rule.type,
    isPrebuilt: rule.rule_source.type === 'external',
    isCustomized: isCustomizedPrebuiltRule(rule),
    restoredRevisionTimestamp,
  };
}
