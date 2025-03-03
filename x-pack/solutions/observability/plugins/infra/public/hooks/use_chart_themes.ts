/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibanaContextForPlugin } from './use_kibana';

export const useChartThemes = () => {
  const { services } = useKibanaContextForPlugin();

  return {
    baseTheme: services.charts.theme.useChartsBaseTheme(),
    sparklineTheme: services.charts.theme.useSparklineOverrides(),
  };
};
