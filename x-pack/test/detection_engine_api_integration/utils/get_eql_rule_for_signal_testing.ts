/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleForSignalTesting } from './get_rule_for_signal_testing';

import type { EqlCreateSchema } from '../../../plugins/security_solution/common/detection_engine/schemas/request';

/**
 * This is a typical signal testing rule that is easy for most basic testing of output of EQL signals.
 * It starts out in an enabled true state. The 'from' is set very far back to test the basics of signal
 * creation for EQL and testing by getting all the signals at once.
 * @param ruleId The optional ruleId which is eql-rule by default.
 * @param enabled Enables the rule on creation or not. Defaulted to true.
 */
export const getEqlRuleForSignalTesting = (
  index: string[],
  ruleId = 'eql-rule',
  enabled = true
): EqlCreateSchema => ({
  ...getRuleForSignalTesting(index, ruleId, enabled),
  type: 'eql',
  language: 'eql',
  query: 'any where true',
});
