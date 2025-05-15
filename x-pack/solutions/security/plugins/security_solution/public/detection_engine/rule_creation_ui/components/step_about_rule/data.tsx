/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiHealth, useEuiTheme } from '@elastic/eui';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import * as I18n from './translations';

import { getRiskSeverityColors } from '../../../../common/utils/risk_color_palette';

export interface SeverityOptionItem {
  value: Severity;
  inputDisplay: React.ReactElement;
}

const StyledEuiHealth = styled(EuiHealth)`
  line-height: inherit;
`;

export enum SeverityLevel {
  low = 'low',
  medium = 'medium',
  high = 'high',
  critical = 'critical',
}

const getSeverityOptions: (euiTheme: EuiThemeComputed) => SeverityOptionItem[] = (euiTheme) => {
  const palette = getRiskSeverityColors(euiTheme);
  return [
    {
      value: SeverityLevel.low,
      inputDisplay: <StyledEuiHealth color={palette.low}>{I18n.LOW}</StyledEuiHealth>,
    },
    {
      value: SeverityLevel.medium,
      inputDisplay: <StyledEuiHealth color={palette.medium}>{I18n.MEDIUM}</StyledEuiHealth>,
    },
    {
      value: SeverityLevel.high,
      inputDisplay: <StyledEuiHealth color={palette.high}>{I18n.HIGH}</StyledEuiHealth>,
    },
    {
      value: SeverityLevel.critical,
      inputDisplay: <StyledEuiHealth color={palette.critical}>{I18n.CRITICAL}</StyledEuiHealth>,
    },
  ];
};

export const useSeverityOptions = () => {
  const { euiTheme } = useEuiTheme();
  const severityOptions = useMemo(() => getSeverityOptions(euiTheme), [euiTheme]);

  return severityOptions;
};
