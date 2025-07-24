/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import * as i18n from './translations';
import { CostSavingsTrend } from './cost_savings_trend';

interface Props {
  attackAlertIds: string[];
  from: string;
  to: string;
}

export const CostSavings: React.FC<Props> = ({ attackAlertIds, from, to }) => {
  return (
    <EuiPanel paddingSize="l">
      <EuiTitle size="s">
        <h3>{i18n.COST_SAVINGS_TREND}</h3>
      </EuiTitle>
      <EuiText size="s">
        <p>{i18n.COST_SAVINGS_SOC}</p>
      </EuiText>
      <EuiSpacer size="l" />
      <CostSavingsTrend from={from} to={to} attackAlertIds={attackAlertIds} />
    </EuiPanel>
  );
};
