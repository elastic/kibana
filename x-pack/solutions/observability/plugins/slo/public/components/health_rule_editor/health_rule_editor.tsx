/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import { HealthRuleParams, ValidationHealthRuleResult } from './types';

type Props = RuleTypeParamsExpressionProps<HealthRuleParams> & ValidationHealthRuleResult;

export function HealthRuleEditor(props: Props) {
  // @ts-ignore
  const { setRuleParams, ruleParams, errors } = props;

  return (
    <>
      <EuiTitle size="xs">
        <h5>
          {i18n.translate('xpack.slo.healthRule.monitoringList', {
            defaultMessage: 'Choose a SLO to monitor',
          })}
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
    </>
  );
}
