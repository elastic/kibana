/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AnalyticsServiceStart } from '@kbn/core/server';
import {
  ThreeWayDiffOutcome,
  ThreeWayDiffConflict,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { DETECTION_RULE_UPDATE_EVENT } from '../../../../telemetry/event_based/events';

interface BasicDiffInfo {
  conflict: ThreeWayDiffConflict;
  diff_outcome?: ThreeWayDiffOutcome;
}

type BasicRuleFieldsDiff = Record<string, BasicDiffInfo>;

type UpdateRuleFinalResult = 'SUCCESS' | 'SKIP' | 'ERROR';

export interface RuleUpdateContext {
  ruleId: string;
  ruleName: string;
  hasBaseVersion: boolean;
  fieldsDiff: BasicRuleFieldsDiff;
}

export interface RuleUpdateTelemetry {
  ruleId: string;
  ruleName: string;
  hasBaseVersion: boolean;
  updatedFieldsSummary: {
    count: number;
    nonSolvableConflictsCount: number;
    solvableConflictsCount: number;
    noConflictsCount: number;
  };
  updatedFieldsTotal: string[];
  updatedFieldsWithNonSolvableConflicts: string[];
  updatedFieldsWithSolvableConflicts: string[];
  updatedFieldsWithNoConflicts: string[];
  finalResult: UpdateRuleFinalResult;
}

interface CreateRuleUpdateTelemetryEventParams {
  fieldsDiff: BasicRuleFieldsDiff;
  ruleId: string;
  ruleName: string;
  hasBaseVersion: boolean;
  finalResult: UpdateRuleFinalResult;
}

function createRuleUpdateTelemetryEvent({
  fieldsDiff,
  ruleId,
  ruleName,
  hasBaseVersion,
  finalResult,
}: CreateRuleUpdateTelemetryEventParams): RuleUpdateTelemetry {
  const updatedFieldsTotal: string[] = [];
  const updatedFieldsWithNonSolvableConflicts: string[] = [];
  const updatedFieldsWithSolvableConflicts: string[] = [];
  const updatedFieldsWithNoConflicts: string[] = [];

  Object.entries(fieldsDiff).forEach(([fieldName, diff]) => {
    if (fieldName === 'version') {
      return;
    }

    const isUpdatableOutcome =
      diff.diff_outcome === ThreeWayDiffOutcome.CustomizedValueSameUpdate ||
      diff.diff_outcome === ThreeWayDiffOutcome.StockValueCanUpdate ||
      diff.diff_outcome === ThreeWayDiffOutcome.CustomizedValueCanUpdate ||
      diff.diff_outcome === ThreeWayDiffOutcome.MissingBaseCanUpdate;

    if (!isUpdatableOutcome) {
      return;
    }

    updatedFieldsTotal.push(fieldName);

    switch (diff.conflict) {
      case ThreeWayDiffConflict.NON_SOLVABLE:
        updatedFieldsWithNonSolvableConflicts.push(fieldName);
        break;
      case ThreeWayDiffConflict.SOLVABLE:
        updatedFieldsWithSolvableConflicts.push(fieldName);
        break;
      case ThreeWayDiffConflict.NONE:
      default:
        updatedFieldsWithNoConflicts.push(fieldName);
        break;
    }
  });

  return {
    ruleId,
    ruleName,
    hasBaseVersion,
    updatedFieldsSummary: {
      count: updatedFieldsTotal.length,
      nonSolvableConflictsCount: updatedFieldsWithNonSolvableConflicts.length,
      solvableConflictsCount: updatedFieldsWithSolvableConflicts.length,
      noConflictsCount: updatedFieldsWithNoConflicts.length,
    },
    updatedFieldsTotal,
    updatedFieldsWithNonSolvableConflicts,
    updatedFieldsWithSolvableConflicts,
    updatedFieldsWithNoConflicts,
    finalResult,
  };
}

interface BasicRuleResponse {
  rule_id: string;
}

interface BasicInstallationError {
  item: {
    rule_id: string;
  };
}

interface BasicSkippedRule {
  rule_id: string;
}

export function sendRuleUpdateTelemetryEvents(
  analytics: AnalyticsServiceStart,
  RuleUpdateContextsMap: Map<string, RuleUpdateContext>,
  updatedRules: BasicRuleResponse[],
  installationErrors: BasicInstallationError[],
  skippedRules: BasicSkippedRule[]
) {
  try {
    for (const ruleResponse of updatedRules) {
      const ruleUpdateContext = RuleUpdateContextsMap.get(ruleResponse.rule_id);
      if (ruleUpdateContext) {
        const event: RuleUpdateTelemetry = createRuleUpdateTelemetryEvent({
          fieldsDiff: ruleUpdateContext.fieldsDiff,
          ruleId: ruleUpdateContext.ruleId,
          ruleName: ruleUpdateContext.ruleName,
          hasBaseVersion: ruleUpdateContext.hasBaseVersion,
          finalResult: 'SUCCESS',
        });
        analytics.reportEvent(DETECTION_RULE_UPDATE_EVENT.eventType, event);
      }
    }

    for (const erroredRule of installationErrors) {
      const ruleUpdateContext = RuleUpdateContextsMap.get(erroredRule.item.rule_id);
      if (ruleUpdateContext) {
        const event: RuleUpdateTelemetry = createRuleUpdateTelemetryEvent({
          fieldsDiff: ruleUpdateContext.fieldsDiff,
          ruleId: ruleUpdateContext.ruleId,
          ruleName: ruleUpdateContext.ruleName,
          hasBaseVersion: ruleUpdateContext.hasBaseVersion,
          finalResult: 'ERROR',
        });
        analytics.reportEvent(DETECTION_RULE_UPDATE_EVENT.eventType, event);
      }
    }

    for (const skippedRule of skippedRules) {
      const ruleUpdateContext = RuleUpdateContextsMap.get(skippedRule.rule_id);
      if (ruleUpdateContext) {
        const event: RuleUpdateTelemetry = createRuleUpdateTelemetryEvent({
          fieldsDiff: ruleUpdateContext.fieldsDiff,
          ruleId: ruleUpdateContext.ruleId,
          ruleName: ruleUpdateContext.ruleName,
          hasBaseVersion: ruleUpdateContext.hasBaseVersion,
          finalResult: 'SKIP',
        });
        analytics.reportEvent(DETECTION_RULE_UPDATE_EVENT.eventType, event);
      }
    }
  } catch (e) {
    // we don't want telemetry errors to impact the main flow
    // eslint-disable-next-line no-console
    console.error('Failed to send detection rule update telemetry', e);
  }
}
