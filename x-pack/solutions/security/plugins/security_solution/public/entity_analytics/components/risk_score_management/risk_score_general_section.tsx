/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiSpacer,
  EuiTitle,
  EuiCheckbox,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
} from '@elastic/eui';

import * as i18n from '../../translations';

import type { RiskScoreConfiguration } from './hooks/risk_score_configurable_risk_engine_settings_hooks';

interface RiskScoreGeneralSectionProps {
  riskEngineSettings: RiskScoreConfiguration;
  toggleScoreRetainment: () => void;
}

export const RiskScoreGeneralSection = (props: RiskScoreGeneralSectionProps) => {
  return (
    <>
      <EuiTitle>
        <h2>{i18n.RISK_SCORE_GENERAL_SECTION}</h2>
      </EuiTitle>
      <EuiSpacer />
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            id={'riskScoreRetainCheckbox'}
            label={i18n.RISK_SCORE_RETAINMENT_CHECKBOX}
            checked={!props.riskEngineSettings.enableResetToZero}
            onChange={props.toggleScoreRetainment}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiIconTip type="info" content={i18n.RISK_SCORE_RETAINMENT_TOOLTIP} position="right" />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule />
    </>
  );
};
