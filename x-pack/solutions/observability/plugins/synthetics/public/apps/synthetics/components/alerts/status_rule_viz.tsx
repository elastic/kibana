/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { inspectStatusRuleAction } from '../../state/alert_rules';
import { StatusRuleParamsProps } from './status_rule_ui';
import { RuleViz } from './rule_viz';

export const StatusRuleViz = ({
  ruleParams,
}: {
  ruleParams: StatusRuleParamsProps['ruleParams'];
}) => {
  const dispatchedAction = useMemo(() => inspectStatusRuleAction.get(ruleParams), [ruleParams]);
  return <RuleViz dispatchedAction={dispatchedAction} />;
};
