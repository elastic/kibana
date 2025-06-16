/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { Filter } from '@kbn/es-query';
import { EuiSpacer } from '@elastic/eui';
import { SyntheticsMonitorStatusRuleParams as StatusRuleParams } from '@kbn/response-ops-rule-params/synthetics_monitor_status';
import { StatusRuleViz } from './status_rule_viz';
import { FieldFilters } from './common/field_filters';
import { AlertSearchBar } from './query_bar';
import { StatusRuleExpression } from './status_rule_expression';

export type StatusRuleParamsProps = RuleTypeParamsExpressionProps<StatusRuleParams>;

export const StatusRuleComponent: React.FC<{
  ruleParams: StatusRuleParamsProps['ruleParams'];
  setRuleParams: StatusRuleParamsProps['setRuleParams'];
}> = ({ ruleParams, setRuleParams }) => {
  const onFiltersChange = useCallback(
    (val: { kqlQuery?: string; filters?: Filter[] }) => {
      setRuleParams('kqlQuery', val.kqlQuery);
    },
    [setRuleParams]
  );

  return (
    <>
      <AlertSearchBar kqlQuery={ruleParams.kqlQuery ?? ''} onChange={onFiltersChange} />
      <EuiSpacer size="m" />
      <FieldFilters ruleParams={ruleParams} setRuleParams={setRuleParams} />
      <StatusRuleViz ruleParams={ruleParams} />
      <EuiSpacer size="m" />
      <StatusRuleExpression ruleParams={ruleParams} setRuleParams={setRuleParams} />
    </>
  );
};
