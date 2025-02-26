/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeComputed } from '@elastic/eui';

export const getColor = (euiTheme: EuiThemeComputed, isEnabled: boolean, status?: string) => {
  if (!isEnabled) {
    return euiTheme.colors.backgroundBaseDisabled;
  }
  const isAmsterdam = euiTheme.flags.hasVisColorAdjustment;

  // make sure these are synced with slo card colors while making changes

  switch (status) {
    case 'down':
      return isAmsterdam
        ? euiTheme.colors.vis.euiColorVisBehindText9
        : euiTheme.colors.backgroundBaseDanger;
    case 'up':
      return isAmsterdam
        ? euiTheme.colors.vis.euiColorVisBehindText0
        : euiTheme.colors.backgroundBaseSuccess;
    case 'unknown':
      return euiTheme.colors.backgroundBasePlain;
    default:
      return isAmsterdam
        ? euiTheme.colors.vis.euiColorVisBehindText0
        : euiTheme.colors.backgroundBaseSuccess;
  }
};
