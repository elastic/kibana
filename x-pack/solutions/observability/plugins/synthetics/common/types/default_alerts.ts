/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SanitizedRule, SanitizedRuleAction, RuleSystemAction } from '@kbn/alerting-plugin/common';
import { SYNTHETICS_STATUS_RULE, SYNTHETICS_TLS_RULE } from '../constants/synthetics_alerts';

export type DefaultRuleType = typeof SYNTHETICS_STATUS_RULE | typeof SYNTHETICS_TLS_RULE;
type SYNTHETICS_DEFAULT_RULE = Omit<SanitizedRule<{}>, 'systemActions' | 'actions'> & {
  actions: Array<SanitizedRuleAction | RuleSystemAction>;
  ruleTypeId: SanitizedRule['alertTypeId'];
};

export interface DEFAULT_ALERT_RESPONSE {
  statusRule: SYNTHETICS_DEFAULT_RULE | null;
  tlsRule: SYNTHETICS_DEFAULT_RULE | null;
}
