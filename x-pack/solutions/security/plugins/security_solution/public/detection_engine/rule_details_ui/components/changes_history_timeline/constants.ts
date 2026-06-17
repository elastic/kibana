/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleChangeTrackingAction } from '@kbn/alerting-types';
import { SecurityRuleChangeTrackingAction } from '../../../../../common/detection_engine/rule_management/rule_change_tracking';

export const DATE_DISPLAY_FORMAT = 'MMM D\\, YYYY @ HH:mm';
export const DATE_DISPLAY_FORMAT_WITH_SECONDS = 'MMM D, YYYY @ HH:mm:ss';

/**
 * Maximum number of changed-field badges rendered inline on a timeline row
 * before the remainder is collapsed into a trailing "+N" overflow badge.
 * Keeps each row at a stable height when a single change touches many fields
 * (e.g. bulk edit or prebuilt rule upgrade).
 */
export const INLINE_CHANGED_FIELDS_LIMIT = 3;

export const DIFFABLE_CHANGE_ACTIONS: ReadonlyArray<string> = [
  RuleChangeTrackingAction.ruleUpdate,
  RuleChangeTrackingAction.ruleCreate,
  SecurityRuleChangeTrackingAction.ruleInstall,
  SecurityRuleChangeTrackingAction.ruleUpgrade,
  SecurityRuleChangeTrackingAction.ruleDuplicate,
  SecurityRuleChangeTrackingAction.ruleImport,
  SecurityRuleChangeTrackingAction.ruleRevert,
];
