/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PartialTheme, Theme } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { useMemo } from 'react';

export function useChartThemes(): { baseTheme: Theme; theme: PartialTheme[] } {
  const baseTheme = useElasticChartsTheme();

  return useMemo(() => {
    const themeOverrides: PartialTheme = {
      chartMargins: {
        left: 10,
        right: 10,
        top: 35,
        bottom: 10,
      },
      background: {
        color: 'transparent',
      },
      lineSeriesStyle: {
        point: { visible: 'never' },
      },
      areaSeriesStyle: {
        point: { visible: 'never' },
      },
    };

    return {
      theme: [themeOverrides],
      baseTheme,
    };
  }, [baseTheme]);
}
