/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';

import type { MalwareFamilyCount } from '../../../common/detonate';
import {
  FAMILIES_AXIS_DETECTIONS,
  TOP_FAMILIES_EMPTY,
  TOP_FAMILIES_SUBTITLE,
  TOP_FAMILIES_TITLE,
} from '../translations';
import { BreakdownChart } from './breakdown_chart';

interface TopFamiliesChartProps {
  families: MalwareFamilyCount[];
  isLoading: boolean;
  selected: string[];
  onToggle: (family: string) => void;
}

const TopFamiliesChartComponent: React.FC<TopFamiliesChartProps> = ({
  families,
  isLoading,
  selected,
  onToggle,
}) => {
  const { euiTheme } = useEuiTheme();

  const data = useMemo(
    () => families.map(({ family, count }) => ({ key: family, count })),
    [families]
  );

  const categories = useMemo(
    () => new Map(families.map(({ family, category }) => [family, category])),
    [families]
  );

  const renderLabel = useCallback(
    (family: string) => {
      const category = categories.get(family);
      return category ? `${family} (${category})` : family;
    },
    [categories]
  );

  return (
    <BreakdownChart
      title={TOP_FAMILIES_TITLE}
      subtitle={TOP_FAMILIES_SUBTITLE}
      data={data}
      renderLabel={renderLabel}
      selected={selected}
      onToggle={onToggle}
      axisTitle={FAMILIES_AXIS_DETECTIONS}
      emptyMessage={TOP_FAMILIES_EMPTY}
      color={euiTheme.colors.vis.euiColorVis6}
      isLoading={isLoading}
      dataTestSubj="detonateTopFamilies"
    />
  );
};

export const TopFamiliesChart = React.memo(TopFamiliesChartComponent);
