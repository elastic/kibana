/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleChangeHistoryDocument } from '@kbn/alerting-plugin/server';
import type { RuleHistoryItem } from '../../../../../../common/api/detection_engine/rule_management';
import { convertAlertingRuleToRuleResponse } from '../detection_rules_client/converters/convert_alerting_rule_to_rule_response';
import { computeOldValues } from './compute_old_values';

/**
 * Convert a single alerting-framework `RuleChangeHistoryDocument` into the
 * API-shaped `RuleHistoryItem`. `old_values` is the RFC 7396 merge patch
 * describing the fields that differ between this revision's snapshot and the
 * immediately preceding one (or `null` for creation events).
 */
export const mapRuleHistoryItem = (
  current: RuleChangeHistoryDocument,
  previous?: RuleChangeHistoryDocument
): RuleHistoryItem => {
  const rule = convertAlertingRuleToRuleResponse(current.rule);
  const previousRule = previous ? convertAlertingRuleToRuleResponse(previous.rule) : undefined;

  return {
    timestamp: current['@timestamp'],
    id: current.event.id,
    user: current.user ? { id: current.user.id, name: current.user.name } : null,
    action: current.event.action,
    rule,
    old_values: computeOldValues(rule, previousRule),
    metadata: current.metadata,
  };
};
