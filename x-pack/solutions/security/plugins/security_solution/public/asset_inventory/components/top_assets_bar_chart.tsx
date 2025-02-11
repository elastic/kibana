/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Chart, Settings, Axis, BarSeries, Position, ScaleType } from '@elastic/charts';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';

const chartTitle = i18n.translate(
  'xpack.securitySolution.assetInventory.topAssetsBarChart.chartTitle',
  {
    defaultMessage: 'Top 10 Asset Types',
  }
);

const yAxisTitle = i18n.translate(
  'xpack.securitySolution.assetInventory.topAssetsBarChart.yAxisTitle',
  {
    defaultMessage: 'Count of Assets',
  }
);

const chartStyles = { height: '260px' };

export interface AssetGroup {
  category: string;
  source: string;
  count: number;
}

// Example output:
//
// [
//   { category: 'cloud-compute', source: 'gcp-compute', count: 500, },
//   { category: 'cloud-compute', source: 'aws-security', count: 300, },
//   { category: 'cloud-storage', source: 'gcp-compute', count: 221, },
//   { category: 'cloud-storage', source: 'aws-security', count: 117, },
// ];
const groupByCategoryAndSource = (entities: DataTableRecord[]): AssetGroup[] => {
  const counts = new Map<string, number>();
  const delimiter = '::';

  for (const entity of entities) {
    const category = entity.flattened['entity.category'] as string; // TODO verify attribute
    const source = entity.flattened['entity.type'] as string; // TODO verify attribute
    const key = `${category}${delimiter}${source}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return Array.from(counts, ([key, count]) => {
    const [category, source] = key.split(delimiter);
    return { category, source, count };
  });
};

export interface TopAssetsBarChartProps {
  entities: DataTableRecord[];
}

export const TopAssetsBarChart = ({ entities }: TopAssetsBarChartProps) => {
  const baseTheme = useElasticChartsTheme();
  return (
    <div css={chartStyles}>
      <Chart title={chartTitle}>
        <Settings baseTheme={baseTheme} showLegend={true} animateData={true} />
        <Axis
          id="X-axis"
          position={Position.Bottom}
          gridLine={{
            visible: false,
          }}
        />
        <Axis
          id="Y-axis"
          position={Position.Left}
          title={yAxisTitle}
          maximumFractionDigits={0}
          showOverlappingTicks={false}
          gridLine={{
            visible: false,
          }}
        />
        <BarSeries
          id="grouped-categories"
          xScaleType={ScaleType.Ordinal}
          yScaleType={ScaleType.Linear}
          xAccessor="category"
          yAccessors={['count']}
          yNice={true}
          splitSeriesAccessors={['source']}
          stackAccessors={['category']}
          minBarHeight={1}
          data={groupByCategoryAndSource(entities).sort((a, b) => b.count - a.count)}
          // TODO Remove mocked data
          // data={[
          //   { category: 'cloud-compute', source: 'gcp-compute', count: 500 },
          //   { category: 'cloud-compute', source: 'aws-security', count: 300 },
          //   { category: 'cloud-storage', source: 'gcp-compute', count: 221 },
          //   { category: 'cloud-storage', source: 'aws-security', count: 117 },
          //   { category: 'other', source: 'aws-security', count: 42 },
          //   { category: 'other', source: 'gcp-compute', count: 38 },
          // ]}
        />
      </Chart>
    </div>
  );
};
