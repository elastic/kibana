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

export type BasicRuleFieldsDiff = Record<string, BasicDiffInfo>;

type UpdateRuleFinalResult = 'SUCCESS' | 'SKIP' | 'ERROR';

export interface RuleUpdateTelemetryDraft {
  ruleId: string;
  ruleName: string;
  hasMissingBaseVersion: boolean;
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
}

export interface RuleUpdateTelemetry extends RuleUpdateTelemetryDraft {
  finalResult: UpdateRuleFinalResult;
}

interface BuildRuleUpdateTelemetryDraftParams {
  calculatedRuleDiff: BasicRuleFieldsDiff;
  ruleId: string;
  ruleName: string;
  hasMissingBaseVersion: boolean;
}

export function buildRuleUpdateTelemetryDraft({
  calculatedRuleDiff,
  ruleId,
  ruleName,
  hasMissingBaseVersion,
}: BuildRuleUpdateTelemetryDraftParams): RuleUpdateTelemetryDraft {
  const updatedFieldsTotal: string[] = [];
  const updatedFieldsWithNonSolvableConflicts: string[] = [];
  const updatedFieldsWithSolvableConflicts: string[] = [];
  const updatedFieldsWithNoConflicts: string[] = [];

  for (const [fieldName, diff] of Object.entries(calculatedRuleDiff)) {
    if (fieldName !== 'version') {
      const isUpdatableOutcome =
        diff.diff_outcome === ThreeWayDiffOutcome.CustomizedValueSameUpdate ||
        diff.diff_outcome === ThreeWayDiffOutcome.StockValueCanUpdate ||
        diff.diff_outcome === ThreeWayDiffOutcome.CustomizedValueCanUpdate ||
        diff.diff_outcome === ThreeWayDiffOutcome.MissingBaseCanUpdate;

      if (isUpdatableOutcome) {
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
      }
    }
  }

  const nonSolvableConflictCount = updatedFieldsWithNonSolvableConflicts.length;
  const solvableConflictCount = updatedFieldsWithSolvableConflicts.length;
  const noConflictCount = updatedFieldsWithNoConflicts.length;

  return {
    ruleId,
    ruleName,
    hasMissingBaseVersion,
    updatedFieldsSummary: {
      count: updatedFieldsTotal.length,
      nonSolvableConflictsCount: nonSolvableConflictCount,
      solvableConflictsCount: solvableConflictCount,
      noConflictsCount: noConflictCount,
    },
    updatedFieldsTotal,
    updatedFieldsWithNonSolvableConflicts,
    updatedFieldsWithSolvableConflicts,
    updatedFieldsWithNoConflicts,
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
  draftsByRuleId: Map<string, RuleUpdateTelemetryDraft>,
  updatedRules: BasicRuleResponse[],
  installationErrors: BasicInstallationError[],
  skippedRules: BasicSkippedRule[]
) {
  try {
    for (const ruleResponse of updatedRules) {
      const draft = draftsByRuleId.get(ruleResponse.rule_id);
      if (draft) {
        const event: RuleUpdateTelemetry = { ...draft, finalResult: 'SUCCESS' };
        analytics.reportEvent(DETECTION_RULE_UPDATE_EVENT.eventType, event);
      }
    }

    for (const erroredRule of installationErrors) {
      const draft = draftsByRuleId.get(erroredRule.item.rule_id);
      if (draft) {
        const event: RuleUpdateTelemetry = { ...draft, finalResult: 'ERROR' };
        analytics.reportEvent(DETECTION_RULE_UPDATE_EVENT.eventType, event);
      }
    }

    for (const skippedRule of skippedRules) {
      const draft = draftsByRuleId.get(skippedRule.rule_id);
      if (draft) {
        const event: RuleUpdateTelemetry = { ...draft, finalResult: 'SKIP' };
        analytics.reportEvent(DETECTION_RULE_UPDATE_EVENT.eventType, event);
      }
    }
  } catch (e) {
    // we don't want telemetry errors to impact the main flow
    // eslint-disable-next-line no-console
    console.error('Failed to send detection rule update telemetry', e);
  }
}
