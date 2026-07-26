/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import type { PartialTheme } from '@elastic/charts';
import { Chart, Partition, PartitionLayout, Settings, INPUT_KEY } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';

const DEFAULT_HEIGHT = 220;

export interface DonutChartProps {
  /** Unique id for the chart. */
  id: string;
  /** Slices to render. */
  data: Array<{ label: string; value: number }>;
  /** One colour per slice, in order. */
  colors: string[];
  /** Sum of all slices – used for the centre label & empty-state check. */
  total: number;
  /** Chart height in px. */
  height?: number;
  /** Text shown below the total in the donut hole. */
  centerLabel?: string;
  /** Title shown in the empty-state prompt. */
  emptyTitle?: string;
  /** Body text shown in the empty-state prompt. */
  emptyBody?: string;
}

/** Re-usable donut chart built on top of Partition (sunburst with a hole). */
export const DonutChart = memo(function DonutChart({
  id,
  data,
  colors,
  total,
  height = DEFAULT_HEIGHT,
  centerLabel,
  emptyTitle,
  emptyBody,
}: DonutChartProps) {
  const baseTheme = useElasticChartsTheme();

  const donutTheme: PartialTheme = useMemo(
    () => ({
      partition: {
        emptySizeRatio: 0.4,
        linkLabel: { maxCount: 0, fontSize: 0, textColor: 'transparent' },
        minFontSize: 0,
        maxFontSize: 0,
      },
    }),
    []
  );

  if (total === 0) {
    return (
      <EuiEmptyPrompt
        iconType="visArea"
        title={<h4>{emptyTitle ?? 'No data'}</h4>}
        body={<p>{emptyBody ?? 'No data available.'}</p>}
      />
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <Chart size={{ height }}>
        <Settings baseTheme={baseTheme} theme={donutTheme} showLegend legendPosition="right" />
        <Partition
          id={id}
          data={data}
          layout={PartitionLayout.sunburst}
          valueAccessor={(d) => d.value}
          layers={[
            {
              groupByRollup: (d: { label: string }) => d.label,
              shape: {
                fillColor: (_key: string | number, sortIndex: number, node) =>
                  colors[(node[INPUT_KEY]?.[0] ?? sortIndex) % colors.length],
              },
            },
          ]}
        />
      </Chart>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '35%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <EuiText size="m">
          <strong>{total}</strong>
        </EuiText>
        {centerLabel && (
          <EuiText size="xs" color="subdued">
            {centerLabel}
          </EuiText>
        )}
      </div>
    </div>
  );
});
