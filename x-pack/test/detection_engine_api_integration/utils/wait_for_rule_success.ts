/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutionStatus } from '@kbn/security-solution-plugin/common/detection_engine/rule_monitoring';
import { waitForRuleStatus, WaitForRuleStatusParams } from './wait_for_rule_status';

export const waitForRuleSuccess = (params: WaitForRuleStatusParams): Promise<void> =>
  waitForRuleStatus(RuleExecutionStatus.succeeded, params);
