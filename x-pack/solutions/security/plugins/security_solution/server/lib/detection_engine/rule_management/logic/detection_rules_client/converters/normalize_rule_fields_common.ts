/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolvedSanitizedRule, SanitizedRule } from '@kbn/alerting-plugin/common';
import type { RequiredOptional } from '@kbn/zod-helpers';
import type { SharedResponseProps } from '../../../../../../../common/api/detection_engine/model';
import {
  transformAlertToRuleAction,
  transformAlertToRuleResponseAction,
  transformAlertToRuleSystemAction,
} from '../../../../../../../common/detection_engine/transform_actions';
import type { RuleParams } from '../../../../rule_schema';
import {
  transformFromAlertThrottle,
  transformToActionFrequency,
} from '../../../normalization/rule_actions';
import { migrateLegacyInvestigationFields } from '../../../utils/utils';
import { normalizeRuleSource } from './normalize_rule_source';
import { createRuleExecutionSummary } from '../../../../rule_monitoring';

export function normalizeCommonRuleFields(
  rule: SanitizedRule<RuleParams> | ResolvedSanitizedRule<RuleParams>
): RequiredOptional<SharedResponseProps> {
  const params = rule.params;

  const normalizedRuleSource = normalizeRuleSource({
    immutable: params.immutable,
    ruleSource: params.ruleSource,
  });

  const normalizedInvestigationFields = migrateLegacyInvestigationFields(
    params.investigationFields
  );

  const alertActions = rule.actions.map(transformAlertToRuleAction);
  const throttle = transformFromAlertThrottle(rule);
  const actions = transformToActionFrequency(alertActions, throttle);
  const systemActions = rule.systemActions?.map((action) => {
    const transformedAction = transformAlertToRuleSystemAction(action);
    return transformedAction;
  });

  const executionSummary = createRuleExecutionSummary(rule);

  return {
    // Basic properties
    id: rule.id,
    rule_id: params.ruleId,
    name: rule.name,
    immutable: params.immutable,
    rule_source: normalizedRuleSource,
    version: params.version,
    revision: rule.revision,
    updated_at: rule.updatedAt.toISOString(),
    updated_by: rule.updatedBy ?? 'elastic',
    created_at: rule.createdAt.toISOString(),
    created_by: rule.createdBy ?? 'elastic',

    // Rule schedule and execution-related data
    enabled: rule.enabled,
    interval: rule.schedule.interval,
    from: params.from,
    to: params.to,
    execution_summary: executionSummary ?? undefined,

    // Additional information about the rule
    description: params.description,
    tags: rule.tags,
    author: params.author,
    license: params.license,
    threat: params.threat,
    timeline_id: params.timelineId,
    timeline_title: params.timelineTitle,
    investigation_fields: normalizedInvestigationFields,
    related_integrations: params.relatedIntegrations ?? [],
    required_fields: params.requiredFields ?? [],
    setup: params.setup ?? '',
    note: params.note,
    false_positives: params.falsePositives,
    references: params.references,

    // Risk score, severity, and overrides
    risk_score: params.riskScore,
    risk_score_mapping: params.riskScoreMapping,
    severity: params.severity,
    severity_mapping: params.severityMapping,
    rule_name_override: params.ruleNameOverride,
    timestamp_override: params.timestampOverride,
    timestamp_override_fallback_disabled: params.timestampOverrideFallbackDisabled,

    // Rule's detection alerts
    building_block_type: params.buildingBlockType,
    output_index: params.outputIndex,
    namespace: params.namespace,
    max_signals: params.maxSignals,

    // Rule's exceptions
    exceptions_list: params.exceptionsList,

    // Rule's notification and response actions
    throttle: undefined,
    actions: [...actions, ...(systemActions ?? [])],
    response_actions: params.responseActions?.map(transformAlertToRuleResponseAction),

    // Technical fields
    meta: params.meta,
    outcome: isResolvedRule(rule) ? rule.outcome : undefined,
    alias_target_id: isResolvedRule(rule) ? rule.alias_target_id : undefined,
    alias_purpose: isResolvedRule(rule) ? rule.alias_purpose : undefined,
  };
}

function isResolvedRule(obj: unknown): obj is ResolvedSanitizedRule<RuleParams> {
  const outcome = (obj as ResolvedSanitizedRule<RuleParams>).outcome;
  return outcome != null && outcome !== 'exactMatch';
}
