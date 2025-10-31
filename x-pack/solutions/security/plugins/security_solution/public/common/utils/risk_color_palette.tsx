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

// Temporary solution until we have a decision for color palette https://github.com/elastic/kibana/issues/203387
export const SEVERITY_COLOR = {
  low: '#54B399',
  medium: '#D6BF57',
  high: '#DA8B45',
  critical: '#E7664C',
} as const;

export const getRiskSeverityColors = (euiTheme: EuiThemeComputed) => SEVERITY_COLOR;

export const useRiskSeverityColors = (): Record<Severity, string> => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => getRiskSeverityColors(euiTheme), [euiTheme]);
};
