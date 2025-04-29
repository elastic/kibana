/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import type { Datum, NodeColorAccessor, PartialTheme, ElementClickListener } from '@elastic/charts';
import type { SerializedStyles } from '@emotion/react';
import {
  Chart,
  Partition,
  Settings,
  PartitionLayout,
  defaultPartitionValueFormatter,
} from '@elastic/charts';
import { isEmpty } from 'lodash';

import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useThemes } from './common';
import { DraggableLegend } from './draggable_legend';
import type { LegendItem } from './draggable_legend_item';
import { DonutChartEmpty } from './donutchart_empty';

const donutTheme: PartialTheme = {
  chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
  partition: {
    idealFontSizeJump: 1.1,
    outerSizeRatio: 1,
    emptySizeRatio: 0.8,
    circlePadding: 4,
  },
};

interface DonutChartData {
  key: string;
  value: number;
  group?: string;
  label?: string;
}

export type FillColor = string | NodeColorAccessor;
export interface DonutChartProps {
  data: DonutChartData[] | null | undefined;
  fillColor: FillColor;
  height?: number;
  label: React.ReactElement | string;
  legendItems?: LegendItem[] | null | undefined;
  /**
   * provides the section name of a clicked donut ring partition
   */
  onPartitionClick?: (level: string) => void;
  title: React.ReactElement | string | number | null;
  totalCount: number | null | undefined;
}

export interface DonutChartWrapperProps {
  children?: React.ReactElement;
  dataExists: boolean;
  donutTextWrapperClassName?: string;
  donutTextWrapperStyles?: SerializedStyles;
  isChartEmbeddablesEnabled?: boolean;
  label?: React.ReactElement | string;
  title: React.ReactElement | string | number | null;
}

const getStyles = (
  dataExists: boolean,
  isChartEmbeddablesEnabled?: boolean,
  donutTextWrapperStyles?: SerializedStyles,
  className?: string
) => {
  return {
    donutTextWrapper: css`
      top: ${isChartEmbeddablesEnabled && !dataExists ? '66%' : '34%'};
      width: 100%;
      max-width: 77px;
      position: absolute; // Make this position absolute in order to overlap the text onto the donut
      z-index: 1;

      ${className && donutTextWrapperStyles ? `&.${className} {${donutTextWrapperStyles}}` : ''}
    `,
    flexItem: css`
      position: relative;
      align-items: center;
    `,
  };
};

const DonutChartWrapperComponent: React.FC<DonutChartWrapperProps> = ({
  children,
  dataExists,
  donutTextWrapperClassName,
  donutTextWrapperStyles,
  isChartEmbeddablesEnabled,
  label,
  title,
}) => {
  const { euiTheme } = useEuiTheme();
  const styles = getStyles(
    dataExists,
    isChartEmbeddablesEnabled,
    donutTextWrapperStyles,
    donutTextWrapperClassName
  );
  const emptyLabelStyle = useMemo(
    () => ({
      color: euiTheme.colors.textSubdued,
    }),
    [euiTheme.colors.textSubdued]
  );
  const className = isChartEmbeddablesEnabled ? undefined : 'eui-textTruncate';

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="center"
      responsive={false}
      gutterSize="l"
      data-test-subj="donut-chart"
    >
      <EuiFlexItem css={styles.flexItem} grow={isChartEmbeddablesEnabled}>
        <EuiFlexGroup
          css={styles.donutTextWrapper}
          alignItems="center"
          className={donutTextWrapperClassName}
          direction="column"
          gutterSize="none"
          justifyContent="center"
        >
          <EuiFlexItem>{title}</EuiFlexItem>
          {label && (
            <EuiFlexItem className={className}>
              <EuiToolTip content={label}>
                <EuiText
                  className={className}
                  size="s"
                  style={dataExists ? undefined : emptyLabelStyle}
                >
                  {label}
                </EuiText>
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        {children}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
export const DonutChartWrapper = React.memo(DonutChartWrapperComponent);

export const DonutChart = ({
  data,
  fillColor,
  height = 90,
  label,
  legendItems,
  onPartitionClick,
  title,
  totalCount,
}: DonutChartProps) => {
  const { baseTheme, theme } = useThemes();

  const onElementClicked: ElementClickListener = useCallback(
    (event) => {
      if (onPartitionClick) {
        const flattened = event.flat(2);
        const level =
          flattened.length > 0 &&
          'groupByRollup' in flattened[0] &&
          flattened[0]?.groupByRollup != null
            ? `${flattened[0].groupByRollup}`
            : '';

        if (!isEmpty(level.trim())) {
          onPartitionClick(level.toLowerCase());
        }
      }
    },
    [onPartitionClick]
  );

  return (
    <DonutChartWrapper
      dataExists={data != null && data.length > 0}
      label={label}
      title={title}
      isChartEmbeddablesEnabled={false}
    >
      <>
        {data == null || totalCount == null || totalCount === 0 ? (
          <DonutChartEmpty size={height} />
        ) : (
          <Chart size={height}>
            <Settings
              theme={[donutTheme, theme]}
              baseTheme={baseTheme}
              onElementClick={onElementClicked}
              locale={i18n.getLocale()}
            />
            <Partition
              id="donut-chart"
              data={data}
              layout={PartitionLayout.sunburst}
              valueAccessor={(d: Datum) => d.value as number}
              valueFormatter={(d: number) => `${defaultPartitionValueFormatter(d)}`}
              layers={[
                {
                  groupByRollup: (d: Datum) => d.label ?? d.key,
                  nodeLabel: (d: Datum) => d,
                  shape: {
                    fillColor,
                  },
                },
              ]}
            />
          </Chart>
        )}

        {legendItems && legendItems?.length > 0 && (
          <EuiFlexItem>
            <DraggableLegend legendItems={legendItems} height={height} />
          </EuiFlexItem>
        )}
      </>
    </DonutChartWrapper>
  );
};
