/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';

import type { BreakdownCount } from '../../../common/detonate';
import { osFamilyLabel } from '../labels';
import {
  PLATFORM_AXIS_DETONATIONS,
  PLATFORM_CHART_EMPTY,
  PLATFORM_CHART_SUBTITLE,
  PLATFORM_CHART_TITLE,
} from '../translations';
import { BreakdownChart } from './breakdown_chart';

const CHART_HEIGHT = 240;

interface PlatformChartProps {
  platforms: BreakdownCount[];
  isLoading: boolean;
  selected: string[];
  onToggle: (platform: string) => void;
}

const PlatformChartComponent: React.FC<PlatformChartProps> = ({
  platforms,
  isLoading,
  selected,
  onToggle,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <BreakdownChart
      title={PLATFORM_CHART_TITLE}
      subtitle={PLATFORM_CHART_SUBTITLE}
      data={platforms}
      renderLabel={osFamilyLabel}
      selected={selected}
      onToggle={onToggle}
      axisTitle={PLATFORM_AXIS_DETONATIONS}
      emptyMessage={PLATFORM_CHART_EMPTY}
      color={euiTheme.colors.vis.euiColorVis0}
      height={CHART_HEIGHT}
      isLoading={isLoading}
      dataTestSubj="detonatePlatformChart"
    />
  );
};

export const PlatformChart = React.memo(PlatformChartComponent);
