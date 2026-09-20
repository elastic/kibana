/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datum, PartialTheme } from '@elastic/charts';
import { Chart, Partition, PartitionLayout, Settings } from '@elastic/charts';
import { EuiHealth, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import React, { type KeyboardEvent } from 'react';

const themeOverrides: PartialTheme = {
  chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
  partition: {
    linkLabel: {
      maximumSection: Infinity,
      maxCount: 0,
    },
    idealFontSizeJump: 1.1,
    outerSizeRatio: 0.95,
    emptySizeRatio: 0.55,
    circlePadding: 4,
  },
};

export interface OverviewStatusDonutSlice {
  value: number;
  label: string;
  color: string;
  dataTestSubj: string;
  isClickable: boolean;
  onClick: () => void;
  tooltipContent?: string;
}

export const OverviewStatusDonut = ({
  slices,
  total,
}: {
  slices: OverviewStatusDonutSlice[];
  total: number;
}) => {
  const { euiTheme } = useEuiTheme();
  const chartBaseTheme = useElasticChartsTheme();
  const legendSlices = slices.filter((slice) => slice.value > 0);

  return (
    <div
      data-test-subj="syntheticsOverviewStatusDonut"
      css={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: euiTheme.size.m,
        width: '100%',
        height: '100%',
      }}
    >
      <div
        css={{
          position: 'relative',
          flex: 1,
          minWidth: 0,
          height: '100%',
        }}
      >
        <Chart size={{ width: '100%', height: '100%' }}>
          <Settings
            theme={[themeOverrides]}
            baseTheme={chartBaseTheme}
            showLegend={false}
            locale={i18n.getLocale()}
          />
          {legendSlices.length > 0 && (
            <Partition
              id="overviewStatusDonut"
              data={legendSlices}
              layout={PartitionLayout.sunburst}
              valueAccessor={(d: Datum) => d.value as number}
              layers={[
                {
                  groupByRollup: (d: Datum) => d.label,
                  nodeLabel: (d: Datum) => d,
                  shape: {
                    fillColor: (dataName) =>
                      slices.find((slice) => slice.label === dataName)?.color ??
                      euiTheme.colors.mediumShade,
                  },
                },
              ]}
            />
          )}
        </Chart>
        <EuiText
          textAlign="center"
          css={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div>
            <div css={{ fontSize: euiTheme.size.l, fontWeight: euiTheme.font.weight.bold }}>
              {total}
            </div>
            <div css={{ fontSize: euiTheme.size.xs, color: euiTheme.colors.subduedText }}>
              {totalLabel}
            </div>
          </div>
        </EuiText>
      </div>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: euiTheme.size.xs,
          flex: '0 0 auto',
        }}
      >
        {legendSlices.map((slice) => (
          <OverviewStatusDonutLegendItem key={slice.dataTestSubj} slice={slice} />
        ))}
      </div>
    </div>
  );
};

const OverviewStatusDonutLegendItem = ({ slice }: { slice: OverviewStatusDonutSlice }) => {
  const { euiTheme } = useEuiTheme();

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      slice.onClick();
    }
  };

  const item = (
    <div
      data-test-subj={slice.dataTestSubj}
      role={slice.isClickable ? 'button' : undefined}
      tabIndex={slice.isClickable ? 0 : undefined}
      onClick={slice.isClickable ? slice.onClick : undefined}
      onKeyDown={slice.isClickable ? onKeyDown : undefined}
      aria-label={`${slice.label} ${slice.value}`}
      css={{
        cursor: slice.isClickable ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
      }}
    >
      <EuiHealth color={slice.color} textSize="xs">
        {/* EuiHealth puts children in a column flex item; one child keeps label + count on one line. */}
        <span css={{ whiteSpace: 'nowrap' }}>
          {slice.label}{' '}
          <span
            css={{
              fontWeight: euiTheme.font.weight.semiBold,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {slice.value}
          </span>
        </span>
      </EuiHealth>
    </div>
  );

  if (!slice.tooltipContent) {
    return item;
  }

  return (
    <EuiToolTip content={slice.tooltipContent} disableScreenReaderOutput>
      {item}
    </EuiToolTip>
  );
};

const totalLabel = i18n.translate('xpack.synthetics.overview.status.donut.total', {
  defaultMessage: 'Monitors',
});
