/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datum, ElementClickListener, PartialTheme } from '@elastic/charts';
import { Chart, Partition, PartitionLayout, Settings } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { i18n } from '@kbn/i18n';
import { useThemes } from '../../../../../common/components/charts/common';
import { DraggableLegend } from '../../../../../common/components/charts/draggable_legend';
import type { LegendItem } from '../../../../../common/components/charts/draggable_legend_item';
import type { AlertSearchResponse } from '../../../../containers/detection_engine/alerts/types';
import { getRiskScorePalette, RISK_SCORE_STEPS } from './lib/chart_palette';
import { getFlattenedBuckets } from './lib/flatten/get_flattened_buckets';
import { getFlattenedLegendItems } from './lib/legend/get_flattened_legend_items';
import {
  getGroupByFieldsOnClick,
  getMaxRiskSubAggregations,
  getUpToMaxBuckets,
  hasOptionalStackByField,
} from './lib/helpers';
import { getLayersMultiDimensional, getLayersOneDimension } from './lib/layers';
import { getFirstGroupLegendItems } from './lib/legend';
import { NoData } from './no_data';
import { NO_DATA_REASON_LABEL } from './translations';
import type { AlertsTreeMapAggregation, FlattenedBucket, RawBucket } from './types';

export const DEFAULT_MIN_CHART_HEIGHT = 240; // px
const DEFAULT_LEGEND_WIDTH = 300; // px

export interface Props {
  addFilter?: ({ field, value }: { field: string; value: string | number }) => void;
  data: AlertSearchResponse<unknown, AlertsTreeMapAggregation>;
  maxBuckets: number;
  minChartHeight?: number;
  stackByField0: string;
  stackByField1: string | undefined;
}

const LegendContainer = styled.div`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
`;

const ChartFlexItem = styled(EuiFlexItem)<{ $minChartHeight: number }>`
  min-height: ${({ $minChartHeight }) => `${$minChartHeight}px`};
`;

const AlertsTreemapComponent: React.FC<Props> = ({
  addFilter,
  data,
  maxBuckets,
  minChartHeight = DEFAULT_MIN_CHART_HEIGHT,
  stackByField0,
  stackByField1,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const { theme, baseTheme } = useThemes();
  const fillColor = useMemo(
    () => theme?.background?.color ?? baseTheme.background.color,
    [theme?.background?.color, baseTheme.background.color]
  );

  const treemapTheme: PartialTheme = useMemo(
    () => ({
      partition: {
        fillLabel: { valueFont: { fontWeight: 700 } },
        idealFontSizeJump: 1.15,
        maxFontSize: 16,
        minFontSize: 4,
        sectorLineStroke: fillColor, // draws the light or dark "lines" between partitions
        sectorLineWidth: 1.5,
      },
    }),
    [fillColor]
  );

  const buckets: RawBucket[] = useMemo(
    () =>
      getUpToMaxBuckets({
        buckets: data.aggregations?.stackByField0?.buckets,
        maxItems: maxBuckets,
      }),
    [data.aggregations?.stackByField0?.buckets, maxBuckets]
  );

  const maxRiskSubAggregations = useMemo(() => getMaxRiskSubAggregations(buckets), [buckets]);

  const flattenedBuckets: FlattenedBucket[] = useMemo(
    () =>
      getFlattenedBuckets({
        buckets,
        maxRiskSubAggregations,
        stackByField0,
      }),
    [buckets, maxRiskSubAggregations, stackByField0]
  );

  const colorPalette = useMemo(() => getRiskScorePalette(RISK_SCORE_STEPS, euiTheme), [euiTheme]);

  const legendItems: LegendItem[] = useMemo(
    () =>
      flattenedBuckets.length === 0
        ? getFirstGroupLegendItems({
            buckets,
            colorPalette,
            maxRiskSubAggregations,
            stackByField0,
          })
        : getFlattenedLegendItems({
            buckets,
            colorPalette,
            flattenedBuckets,
            maxRiskSubAggregations,
            stackByField0,
            stackByField1,
          }),
    [buckets, colorPalette, flattenedBuckets, maxRiskSubAggregations, stackByField0, stackByField1]
  );

  const onElementClick: ElementClickListener = useCallback(
    (event) => {
      const { groupByField0, groupByField1 } = getGroupByFieldsOnClick(event);

      if (addFilter != null && !isEmpty(groupByField0.trim())) {
        addFilter({ field: stackByField0, value: groupByField0 });
      }

      if (addFilter != null && !isEmpty(stackByField1?.trim()) && !isEmpty(groupByField1.trim())) {
        addFilter({ field: `${stackByField1}`, value: groupByField1 });
      }
    },
    [addFilter, stackByField0, stackByField1]
  );

  const layers = useMemo(
    () =>
      hasOptionalStackByField(stackByField1)
        ? getLayersMultiDimensional({
            colorPalette,
            layer0FillColor: fillColor,
            maxRiskSubAggregations,
          })
        : getLayersOneDimension({ colorPalette, maxRiskSubAggregations }),
    [colorPalette, fillColor, maxRiskSubAggregations, stackByField1]
  );

  const valueAccessor = useMemo(
    () =>
      hasOptionalStackByField(stackByField1)
        ? (d: Datum) => d.stackByField1DocCount
        : (d: Datum) => d.doc_count,
    [stackByField1]
  );

  const normalizedData: FlattenedBucket[] = hasOptionalStackByField(stackByField1)
    ? flattenedBuckets
    : buckets;

  if (buckets.length === 0) {
    return <NoData />;
  }

  return (
    <div data-test-subj="alerts-treemap">
      <EuiFlexGroup gutterSize="none">
        <ChartFlexItem grow={true} $minChartHeight={minChartHeight}>
          {stackByField1 != null && !isEmpty(stackByField1) && normalizedData.length === 0 ? (
            <NoData reason={NO_DATA_REASON_LABEL(stackByField1)} />
          ) : (
            <Chart>
              <Settings
                baseTheme={baseTheme}
                showLegend={false}
                theme={[treemapTheme, theme]}
                onElementClick={onElementClick}
                locale={i18n.getLocale()}
              />
              <Partition
                data={normalizedData}
                id="spec_1"
                layers={layers}
                layout={PartitionLayout.treemap}
                valueAccessor={valueAccessor}
              />
            </Chart>
          )}
        </ChartFlexItem>

        <EuiFlexItem grow={false}>
          <LegendContainer>
            {legendItems.length > 0 && (
              <DraggableLegend
                className="eui-yScroll"
                height={minChartHeight}
                legendItems={legendItems}
                minWidth={DEFAULT_LEGEND_WIDTH}
                isInlineActions
              />
            )}
          </LegendContainer>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

export const AlertsTreemap = React.memo(AlertsTreemapComponent);
