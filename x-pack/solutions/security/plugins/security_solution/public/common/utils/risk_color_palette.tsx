/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { useMemo } from 'react';
import {
  RISK_COLOR_CRITICAL,
  RISK_COLOR_HIGH,
  RISK_COLOR_LOW,
  RISK_COLOR_MEDIUM,
} from '../constants';

// Temporary solution until we have a decision for color palette https://github.com/elastic/kibana/issues/203387
export const SEVERITY_COLOR = {
  low: '#54B399',
  medium: '#D6BF57',
  high: '#DA8B45',
  critical: '#E7664C',
} as const;

const isAmsterdam = (euiThemeName: string) => {
  return euiThemeName?.toLowerCase().includes('amsterdam');
};

export const getRiskSeverityColors = (euiTheme: EuiThemeComputed) => {
  if (euiTheme && isAmsterdam(euiTheme.themeName)) {
    return {
      low: RISK_COLOR_LOW,
      medium: RISK_COLOR_MEDIUM,
      high: RISK_COLOR_HIGH,
      critical: RISK_COLOR_CRITICAL,
    };
  }
  return SEVERITY_COLOR;
};

export const useRiskSeverityColors = (): Record<Severity, string> => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => getRiskSeverityColors(euiTheme), [euiTheme]);
};
