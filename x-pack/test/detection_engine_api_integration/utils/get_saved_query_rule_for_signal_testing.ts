/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedQueryRuleCreateProps } from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';
import { getRuleForSignalTesting } from './get_rule_for_signal_testing';

/**
 * This is a typical signal testing rule that is easy for most basic testing of output of Saved Query signals.
 * It starts out in an enabled true state. The 'from' is set very far back to test the basics of signal
 * creation for SavedQuery and testing by getting all the signals at once.
 * @param ruleId The optional ruleId which is threshold-rule by default.
 * @param enabled Enables the rule on creation or not. Defaulted to true.
 */
export const getSavedQueryRuleForSignalTesting = (
  index: string[],
  ruleId = 'saved-query-rule',
  enabled = true
): SavedQueryRuleCreateProps => ({
  ...getRuleForSignalTesting(index, ruleId, enabled),
  type: 'saved_query',
  saved_id: 'abcd',
});
