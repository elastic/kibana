/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  Axis,
  BarSeries,
  Chart,
  Partition,
  PartitionLayout,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { DetonationRow, DetonationVerdict } from './detonation_rows';
import * as i18n from './translations';

const CHART_HEIGHT = 180;
const DONUT_SIZE = 170;
const VERDICTS: DetonationVerdict[] = ['Malicious', 'Suspicious', 'Benign'];

const WidgetPanel = memo(
  ({ title, children, testId }: { title: string; children: React.ReactNode; testId: string }) => (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m" data-test-subj={testId}>
      <EuiTitle size="xxs">
        <h3>{title}</h3>
      </EuiTitle>
      <div css={{ marginTop: 8 }}>{children}</div>
    </EuiPanel>
  )
);
WidgetPanel.displayName = 'WidgetPanel';

interface DonutDatum {
  label: string;
  count: number;
  color: string;
}

/** Thin donut with the total in the middle and a legend with counts on the right. */
const Donut = memo(
  ({ data, totalLabel, testId }: { data: DonutDatum[]; totalLabel: string; testId: string }) => {
    const baseTheme = useElasticChartsTheme();
    const total = data.reduce((sum, d) => sum + d.count, 0);
    const colorByLabel = useMemo(() => new Map(data.map((d) => [d.label, d.color])), [data]);
    return (
      <EuiFlexGroup
        gutterSize="l"
        alignItems="center"
        responsive={false}
        css={{ minHeight: CHART_HEIGHT }}
        data-test-subj={testId}
      >
        <EuiFlexItem grow={false}>
          <div css={{ position: 'relative', width: DONUT_SIZE, height: DONUT_SIZE }}>
            <Chart size={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
              <Settings
                baseTheme={baseTheme}
                showLegend={false}
                theme={{
                  partition: {
                    emptySizeRatio: 0.82,
                    outerSizeRatio: 1,
                    linkLabel: { maximumSection: 0 },
                    sectorLineWidth: 2,
                  },
                }}
              />
              <Partition
                id={`${testId}Partition`}
                data={data}
                layout={PartitionLayout.sunburst}
                valueAccessor={(d: DonutDatum) => d.count}
                layers={[
                  {
                    groupByRollup: (d: DonutDatum) => d.label,
                    nodeLabel: () => '',
                    shape: { fillColor: (key: unknown) => colorByLabel.get(String(key)) ?? '#ccc' },
                  },
                ]}
              />
            </Chart>
            <div
              css={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <EuiText size="s" textAlign="center">
                <strong>{total}</strong>
                <br />
                {totalLabel}
              </EuiText>
            </div>
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
            {data.map((d) => (
              <EuiFlexItem grow={false} key={d.label}>
                <EuiHealth color={d.color} textSize="xs">
                  {`${d.label} · ${d.count}`}
                </EuiHealth>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
Donut.displayName = 'Donut';

export const getFileType = (fileName: string): string => {
  const name = fileName.toLowerCase();
  if (/\.(exe|msi|bin)(\.|$)/.test(name) || name.endsWith('.exe')) return 'EXE';
  if (/\.(dll|sys)$/.test(name)) return 'DLL/SYS';
  if (/\.(docx?|docm|xlsx?|xlsm|pptx?)$/.test(name)) return 'Office';
  if (name.endsWith('.pdf')) return 'PDF';
  if (/\.(zip|rar|7z)$/.test(name)) return 'Archive';
  if (/\.(sh|js|ps1|crx)$/.test(name)) return 'Script';
  return 'Other';
};

/** Start of the week (Monday, UTC) of an ISO date, as epoch ms. */
const weekStart = (iso: string) => {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
};

interface DetonateWidgetsProps {
  rows: DetonationRow[];
}

/** Analytics widgets above the detonations table: verdict breakdown, top submitters and trend. */
export const DetonateWidgets = memo(({ rows }: DetonateWidgetsProps) => {
  const { euiTheme } = useEuiTheme();
  const baseTheme = useElasticChartsTheme();

  const verdictColors = useMemo<Record<DetonationVerdict, string>>(
    () => ({
      Malicious: '#d76d55',
      Suspicious: '#d1c066',
      Benign: '#6db19a',
    }),
    []
  );

  const verdictData = useMemo(
    () =>
      VERDICTS.map((verdict) => ({
        label: verdict,
        color: verdictColors[verdict],
        count: rows.filter((row) => row.verdict === verdict).length,
      })).filter((d) => d.count > 0),
    [rows, verdictColors]
  );

  const fileTypeData = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((row) => {
      const type = getFileType(row.fileName);
      counts.set(type, (counts.get(type) ?? 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));
  }, [rows]);

  const trendData = useMemo(() => {
    const counts = new Map<number, number>();
    rows.forEach((row) => {
      const week = weekStart(row.submitted);
      counts.set(week, (counts.get(week) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([x, y]) => ({ x, y }));
  }, [rows]);

  return (
    <EuiFlexGroup gutterSize="m" responsive data-test-subj="detonateWidgets">
      <EuiFlexItem>
        <WidgetPanel title={i18n.WIDGET_VERDICTS} testId="detonateWidgetVerdicts">
          <Donut
            data={verdictData}
            totalLabel={i18n.WIDGET_DETONATIONS}
            testId="detonateVerdictDonut"
          />
        </WidgetPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <WidgetPanel title={i18n.WIDGET_FILE_TYPES} testId="detonateWidgetFileTypes">
          <Chart size={{ height: CHART_HEIGHT }} data-test-subj="detonateFileTypeChart">
            <Settings baseTheme={baseTheme} showLegend={false} />
            <Axis id="fileTypes" position={Position.Bottom} />
            <Axis id="fileTypeCounts" position={Position.Left} integersOnly />
            <BarSeries
              id="fileTypeBars"
              name={i18n.WIDGET_FILES}
              data={fileTypeData}
              xAccessor="type"
              yAccessors={['count']}
              xScaleType={ScaleType.Ordinal}
              yScaleType={ScaleType.Linear}
              color={euiTheme.colors.primary}
            />
          </Chart>
        </WidgetPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <WidgetPanel title={i18n.WIDGET_TREND} testId="detonateWidgetTrend">
          <Chart size={{ height: CHART_HEIGHT }}>
            <Settings baseTheme={baseTheme} showLegend={false} />
            <Axis
              id="time"
              position={Position.Bottom}
              tickFormat={(v) =>
                new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              }
            />
            <Axis id="count" position={Position.Left} integersOnly />
            <BarSeries
              id="trend"
              name={i18n.WIDGET_DETONATIONS}
              data={trendData}
              xAccessor="x"
              yAccessors={['y']}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              color={euiTheme.colors.primary}
            />
          </Chart>
        </WidgetPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
DetonateWidgets.displayName = 'DetonateWidgets';
