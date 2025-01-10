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

export const getRiskSeverityColors = (euiTheme: EuiThemeComputed) => {
  if (euiTheme.flags.hasVisColorAdjustment) {
    // Amsterdam
    return {
      low: euiTheme.colors.vis.euiColorVis0,
      medium: euiTheme.colors.vis.euiColorVis5,
      high: euiTheme.colors.vis.euiColorVis7,
      critical: euiTheme.colors.vis.euiColorVis9,
    };
  }

  // Borealis
  return {
    low: euiTheme.colors.vis.euiColorVisSuccess0,
    medium: euiTheme.colors.vis.euiColorSeverity7,
    high: euiTheme.colors.vis.euiColorSeverity10,
    critical: euiTheme.colors.vis.euiColorSeverity14,
  };
};

export const useRiskSeverityColors = (): Record<Severity, string> => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => getRiskSeverityColors(euiTheme), [euiTheme]);
};
