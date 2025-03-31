/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PartialTheme,
  Rendering,
  Rotation,
  ScaleType,
  SettingsProps,
  TickFormatter,
  BrushEndListener,
  AxisStyle,
  BarSeriesStyle,
  Theme,
} from '@elastic/charts';
import { LEGACY_DARK_THEME, LEGACY_LIGHT_THEME, Position } from '@elastic/charts';
import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import styled from '@emotion/styled';

import { useDarkMode } from '../../lib/kibana';

export const defaultChartHeight = '100%';
export const defaultChartWidth = '100%';
const chartDefaultRotation: Rotation = 0;
const chartDefaultRendering: Rendering = 'canvas';

export type UpdateDateRange = BrushEndListener;

export interface ChartData {
  x?: number | string | null;
  y?: number | string | null;
  y0?: number;
  g?: number | string | null;
}

export interface ChartSeriesConfigs {
  customHeight?: number;
  color?: string[];
  series?: {
    xScaleType?: ScaleType | undefined;
    yScaleType?: ScaleType | undefined;
    stackAccessors?: string[] | undefined;
    barSeriesStyle?: Partial<BarSeriesStyle>;
  };
  axis?: {
    xTickFormatter?: TickFormatter | undefined;
    yTickFormatter?: TickFormatter | undefined;
    tickSize?: number | undefined;
    left?: {
      style?: Partial<AxisStyle>;
      labelFormat?: (d: unknown) => string;
    };
    bottom?: {
      style?: Partial<AxisStyle>;
      labelFormat?: (d: unknown) => string;
    };
  };
  yAxisTitle?: string | undefined;
  settings?: SettingsProps;
}

export interface ChartSeriesData {
  key: string;
  value: ChartData[] | [] | null;
  color?: string | undefined;
}

const WrappedByAutoSizerComponent = styled.div<{ height?: string }>`
  ${(style) =>
    `
    height: ${style.height != null ? style.height : defaultChartHeight};
  `}
  position: relative;

  &:hover {
    z-index: 100;
  }
`;

WrappedByAutoSizerComponent.displayName = 'WrappedByAutoSizer';

export const WrappedByAutoSizer = React.memo(WrappedByAutoSizerComponent);

export enum SeriesType {
  BAR = 'bar',
  AREA = 'area',
  LINE = 'line',
}

// Apply margins and paddings: https://ela.st/charts-spacing
const theme: PartialTheme = {
  chartMargins: {
    left: 0,
    right: 0,
    // Apply some paddings to the top to avoid chopping the y tick https://ela.st/chopping-edge
    top: 4,
    bottom: 0,
  },
  chartPaddings: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scales: {
    barsPadding: 0.05,
  },
};
export const useThemes = (): { baseTheme: Theme; theme: PartialTheme } => {
  const isDarkMode = useDarkMode();
  // TODO connect to charts.theme service see src/plugins/charts/public/services/theme/README.md
  const baseTheme = isDarkMode ? LEGACY_DARK_THEME : LEGACY_LIGHT_THEME;
  return {
    baseTheme,
    theme,
  };
};

export const chartDefaultSettings: SettingsProps = {
  rotation: chartDefaultRotation,
  rendering: chartDefaultRendering,
  showLegend: false,
  legendValues: [],
  debug: false,
  legendPosition: Position.Bottom,
};

export const getChartHeight = (customHeight?: number, autoSizerHeight?: number): string => {
  const height = customHeight || autoSizerHeight;
  return height ? `${height}px` : defaultChartHeight;
};

export const getChartWidth = (customWidth?: number, autoSizerWidth?: number): string => {
  const height = customWidth || autoSizerWidth;
  return height ? `${height}px` : defaultChartWidth;
};

export const checkIfAllValuesAreZero = (data: ChartSeriesData[] | null | undefined): boolean =>
  Array.isArray(data) &&
  data.every((series) => {
    return Array.isArray(series.value) && (series.value as ChartData[]).every(({ y }) => y === 0);
  });

export const Wrapper = styled.div`
  position: relative;
`;

export const ChartWrapper = styled(EuiFlexGroup)`
  z-index: 0;
`;

export const BarChartWrapper = styled(EuiFlexGroup)`
  z-index: 0;
  padding-right: 20px;
`;
