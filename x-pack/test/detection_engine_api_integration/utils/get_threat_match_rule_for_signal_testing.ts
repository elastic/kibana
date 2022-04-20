/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreatMatchCreateSchema } from '@kbn/security-solution-plugin/common/detection_engine/schemas/request';
import { getRuleForSignalTesting } from './get_rule_for_signal_testing';

/**
 * This is a typical signal testing rule that is easy for most basic testing of output of Threat Match signals.
 * It starts out in an enabled true state. The 'from' is set very far back to test the basics of signal
 * creation for Threat Match and testing by getting all the signals at once.
 * @param ruleId The optional ruleId which is threshold-rule by default.
 * @param enabled Enables the rule on creation or not. Defaulted to true.
 */
export const getThreatMatchRuleForSignalTesting = (
  index: string[],
  ruleId = 'threat-match-rule',
  enabled = true
): ThreatMatchCreateSchema => ({
  ...getRuleForSignalTesting(index, ruleId, enabled),
  type: 'threat_match',
  language: 'kuery',
  query: '*:*',
  threat_query: '*:*',
  threat_mapping: [
    // We match host.name against host.name
    {
      entries: [
        {
          field: 'host.name',
          value: 'host.name',
          type: 'mapping',
        },
      ],
    },
  ],
  threat_index: index, // match against same index for simplicity
});
