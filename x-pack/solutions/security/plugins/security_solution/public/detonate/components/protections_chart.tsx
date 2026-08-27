/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';

import type { BreakdownCount } from '../../../common/detonate';
import { protectionLabel } from '../labels';
import {
  PROTECTIONS_AXIS_DETONATIONS,
  PROTECTIONS_CHART_EMPTY,
  PROTECTIONS_CHART_SUBTITLE,
  PROTECTIONS_CHART_TITLE,
} from '../translations';
import { BreakdownChart } from './breakdown_chart';

const CHART_HEIGHT = 240;

interface ProtectionsChartProps {
  protections: BreakdownCount[];
  isLoading: boolean;
  selected: string[];
  onToggle: (protection: string) => void;
}

const ProtectionsChartComponent: React.FC<ProtectionsChartProps> = ({
  protections,
  isLoading,
  selected,
  onToggle,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <BreakdownChart
      title={PROTECTIONS_CHART_TITLE}
      subtitle={PROTECTIONS_CHART_SUBTITLE}
      data={protections}
      renderLabel={protectionLabel}
      selected={selected}
      onToggle={onToggle}
      axisTitle={PROTECTIONS_AXIS_DETONATIONS}
      emptyMessage={PROTECTIONS_CHART_EMPTY}
      color={euiTheme.colors.vis.euiColorVis2}
      height={CHART_HEIGHT}
      isLoading={isLoading}
      dataTestSubj="detonateProtectionsChart"
    />
  );
};

export const ProtectionsChart = React.memo(ProtectionsChartComponent);
