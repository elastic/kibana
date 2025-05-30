/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { inspectTLSRuleAction } from '../../state/alert_rules';
import { TLSRuleParamsProps } from './tls_rule_ui';
import { RuleViz } from './rule_viz';

export const TLSRuleViz = ({ ruleParams }: { ruleParams: TLSRuleParamsProps['ruleParams'] }) => {
  const dispatchedAction = useMemo(() => inspectTLSRuleAction.get(ruleParams), [ruleParams]);
  return <RuleViz dispatchedAction={dispatchedAction} />;
};
