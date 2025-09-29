/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';

import styled from '@emotion/styled';
import { euiThemeVars } from '@kbn/ui-theme';
// import * as i18n from '../../translations';

import type { RiskScoreConfiguration } from './hooks/risk_score_configurable_risk_engine_settings_hooks';

const StyledList = styled.ul`
  list-style-type: disc;
  padding-left: ${euiThemeVars.euiSizeM};
`;

interface RiskScoreGeneralSectionProps {
  riskEngineSettings: RiskScoreConfiguration;
  toggleScoreRetainment: () => void;
}

export const RiskScoreGeneralSection = (props: RiskScoreGeneralSectionProps) => {
  return (
    <>
      <EuiTitle>
        <h2>"General"</h2>
      </EuiTitle>
      <EuiSpacer />
    </>
  );
};
