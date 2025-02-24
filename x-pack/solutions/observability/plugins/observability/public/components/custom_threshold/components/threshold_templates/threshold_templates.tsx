/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiIcon,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import {
  RuleTypeParams,
  RuleTypeParamsExpressionProps,
} from '@kbn/triggers-actions-ui-plugin/public';
import { AlertContextMeta, AlertParams } from '../../types';
import { thresholds } from './templates';

type Props = Pick<
  RuleTypeParamsExpressionProps<RuleTypeParams & AlertParams, AlertContextMeta>,
  'setRuleParams'
>;

export function ThresholdTemplates({ setRuleParams }: Props) {
  return (
    <EuiPanel>
      <EuiTitle size="s">
        <h3>
          {i18n.translate(
            'xpack.observability.thresholdTemplates.h3.selectThresholdTemplatesLabel',
            { defaultMessage: 'Select Threshold Templates' }
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiKeyPadMenu css={{ width: '100%', justifyContent: 'space-around' }}>
        {thresholds.map((threshold) => {
          return (
            <EuiKeyPadMenuItem
              label={threshold.name}
              onClick={() => {
                setRuleParams('criteria', threshold.params.criteria);
                setRuleParams('alertOnNoData', threshold.params.alertOnNoData);
                setRuleParams('alertOnGroupDisappear', threshold.params.alertOnGroupDisappear);
                setRuleParams('searchConfiguration', threshold.params.searchConfiguration);
              }}
            >
              <EuiIcon type={threshold.iconType} size="l" />
            </EuiKeyPadMenuItem>
          );
        })}
      </EuiKeyPadMenu>
    </EuiPanel>
  );
}
