/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiSpacer, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { ThresholdIndicator } from '../../common/components/thershold_indicator';
import { formatMillisecond } from '../common/network_data/data_formatting';
import { useNetworkTimings } from '../hooks/use_network_timings';
import { useNetworkTimingsPrevious24Hours } from '../hooks/use_network_timings_prev';

export const BreakdownLegend = () => {
  const networkTimings = useNetworkTimings();

  const { timingsWithLabels: prevTimingsWithLabels, loading } = useNetworkTimingsPrevious24Hours();
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiSpacer size="xxl" />
      <EuiFlexGroup direction="column" gutterSize="s">
        {networkTimings.timingsWithLabels.map(({ label, value }, index) => {
          const prevValueItem = prevTimingsWithLabels?.find((prev) => prev.label === label);
          const prevValue = prevValueItem?.value;
          // @ts-ignore
          const color = euiTheme.colors.vis[`euiColorVis${index + 1}`];

          return (
            <EuiFlexGroup key={index} gutterSize="s" alignItems="center">
              <EuiFlexItem grow={true}>
                <EuiHealth color={color}>{label}</EuiHealth>
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ minWidth: 50 }}>
                <ThresholdIndicator
                  loading={loading}
                  currentFormatted={formatMillisecond(value, {})}
                  current={value}
                  previous={prevValue ? prevValue : null}
                  previousFormatted={formatMillisecond(prevValue ?? 0, {})}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        })}
      </EuiFlexGroup>
    </>
  );
};
