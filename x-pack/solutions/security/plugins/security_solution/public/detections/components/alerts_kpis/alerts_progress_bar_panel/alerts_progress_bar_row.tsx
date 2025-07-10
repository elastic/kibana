/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProgress, EuiText, useEuiTheme } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { AlertsProgressBarData } from './types';

/**
 * Renders a EuiProgress, used in the KPI chart for the alerts page as well as the AI for SOC alert summary page.
 */
export const ProgressBarRow: React.FC<{ item: AlertsProgressBarData }> = ({ item }) => {
  const { euiTheme } = useEuiTheme();
  const color = useMemo(
    () =>
      euiTheme.themeName === 'EUI_THEME_BOREALIS'
        ? euiTheme.colors.vis.euiColorVis6
        : euiTheme.colors.vis.euiColorVis9,
    [euiTheme]
  );

  return (
    <EuiProgress
      valueText={
        <EuiText size="xs" color="default">
          <strong>{item.percentageLabel}</strong>
        </EuiText>
      }
      max={1}
      color={color}
      size="s"
      value={item.percentage}
      label={
        item.key === 'Other' ? (
          item.label
        ) : (
          <EuiText size="xs" className="eui-textTruncate">
            {item.key}
          </EuiText>
        )
      }
    />
  );
};

ProgressBarRow.displayName = 'ProgressBarRow';
