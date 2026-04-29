/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';

/**
 * Provides either the input color, or yields the default EUI theme
 * color for use as the KPI chart series color.
 * @param seriesColor A user-defined color value
 * @returns Either the input `seriesColor` or the default color from EUI
 */
export const useChartSeriesColor = (seriesColor?: string): string => {
  const { euiTheme } = useEuiTheme();

  // Prevent empty string being used as a valid color
  return seriesColor || euiTheme.colors.backgroundLightText;
};
