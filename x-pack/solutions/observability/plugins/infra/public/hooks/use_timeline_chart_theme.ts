/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SettingsProps } from '@elastic/charts';
import { useEuiTheme } from '@elastic/eui';
import { useKibanaContextForPlugin } from './use_kibana';

export function useTimelineChartTheme(): Pick<SettingsProps, 'baseTheme' | 'theme'> {
  const { euiTheme } = useEuiTheme();
  const {
    services: { charts },
  } = useKibanaContextForPlugin();

  const baseTheme = charts.theme.useChartsBaseTheme();

  return {
    baseTheme,
    theme: {
      background: {
        color: 'transparent',
      },
      crosshair: {
        band: {
          fill: euiTheme.colors.lightShade,
        },
      },
      axes: {
        gridLine: {
          horizontal: {
            visible: false,
          },
          vertical: {
            dash: undefined,
          },
        },
      },
    },
  };
}
