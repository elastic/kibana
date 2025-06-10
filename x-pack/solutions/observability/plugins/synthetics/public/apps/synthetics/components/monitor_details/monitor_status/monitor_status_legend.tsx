/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  useEuiTheme,
  VISUALIZATION_COLORS,
} from '@elastic/eui';
import * as labels from './labels';
import { getSkippedVizColor } from './monitor_status_data';

export const MonitorStatusLegend = ({ brushable }: { brushable: boolean }) => {
  const { euiTheme } = useEuiTheme();
  const isAmsterdam = euiTheme.flags.hasVisColorAdjustment;

  const SUCCESS_COLOR = isAmsterdam ? VISUALIZATION_COLORS[0] : euiTheme.colors.success;
  const DANGER_COLOR = isAmsterdam
    ? VISUALIZATION_COLORS[VISUALIZATION_COLORS.length - 1]
    : euiTheme.colors.danger;

  const LegendItem = useMemo(() => {
    return ({
      color,
      label,
      iconType = 'dot',
    }: {
      color: string;
      label: string;
      iconType?: string;
    }) => (
      <EuiFlexItem
        css={{
          display: 'flex',
          flexDirection: 'row',
          gap: 2,
        }}
        grow={false}
      >
        <EuiIcon type={iconType} color={color} />
        <EuiText size="xs">{label}</EuiText>
      </EuiFlexItem>
    );
  }, []);

  return (
    <EuiFlexGroup wrap={true} responsive={false}>
      <LegendItem color={SUCCESS_COLOR} label={labels.COMPLETE_LABEL} />
      <LegendItem color={DANGER_COLOR} label={labels.FAILED_LABEL} />
      <LegendItem color={getSkippedVizColor(euiTheme)} label={labels.SKIPPED_LABEL} />
      {/*
        // Hiding error for now until @elastic/chart's Heatmap chart supports annotations
        // `getErrorVizColor` can be imported from './monitor_status_data'
        <LegendItem color={getErrorVizColor(euiTheme)} label={labels.ERROR_LABEL} iconType="warning" />
      */}

      {brushable ? (
        <>
          <EuiFlexItem aria-hidden={true} grow={true} />
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color={euiTheme.colors.textSubdued}>
              {labels.BRUSH_AREA_MESSAGE}
            </EuiText>
          </EuiFlexItem>
        </>
      ) : null}
    </EuiFlexGroup>
  );
};
