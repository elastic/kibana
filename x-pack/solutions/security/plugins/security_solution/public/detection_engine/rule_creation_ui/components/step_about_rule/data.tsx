/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiHealth } from '@elastic/eui';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import * as I18n from './translations';

import {
  RISK_SCORE_LOW,
  RISK_SCORE_MEDIUM,
  RISK_SCORE_HIGH,
  RISK_SCORE_CRITICAL,
} from '../../../../common/constants';
import { getRiskSeverityColors } from '../../../../common/utils/risk_color_palette';

export interface SeverityOptionItem {
  value: Severity;
  inputDisplay: React.ReactElement;
}

const StyledEuiHealth = styled(EuiHealth)`
  line-height: inherit;
`;

export const getSeverityOptions: (euiTheme: EuiThemeComputed) => SeverityOptionItem[] = (
  euiTheme
) => {
  const palette = getRiskSeverityColors(euiTheme);
  return [
    {
      value: 'low',
      inputDisplay: <StyledEuiHealth color={palette.low}>{I18n.LOW}</StyledEuiHealth>,
    },
    {
      value: 'medium',
      inputDisplay: <StyledEuiHealth color={palette.medium}>{I18n.MEDIUM}</StyledEuiHealth>,
    },
    {
      value: 'high',
      inputDisplay: <StyledEuiHealth color={palette.high}>{I18n.HIGH}</StyledEuiHealth>,
    },
    {
      value: 'critical',
      inputDisplay: <StyledEuiHealth color={palette.critical}>{I18n.CRITICAL}</StyledEuiHealth>,
    },
  ];
};

export const defaultRiskScoreBySeverity: Record<Severity, number> = {
  low: RISK_SCORE_LOW,
  medium: RISK_SCORE_MEDIUM,
  high: RISK_SCORE_HIGH,
  critical: RISK_SCORE_CRITICAL,
};
