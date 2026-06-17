/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../utils/kibana_react';

export const useChartThemes = () => {
  const { charts } = useKibana().services;

  return {
    baseTheme: charts.theme.useChartsBaseTheme(),
    sparklineTheme: charts.theme.useSparklineOverrides(),
  };
};
