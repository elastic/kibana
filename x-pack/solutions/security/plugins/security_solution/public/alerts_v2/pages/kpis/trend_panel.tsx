/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { Axis, BarSeries, Chart, Position, ScaleType, Settings } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import { EsqlInspectButton } from './esql_inspect_button';
import { useTrendData } from './use_trend_data';
import { useEpisodeFields } from './episode_fields';

const TITLE = i18n.translate('xpack.securitySolution.alertsV2.trend.title', {
  defaultMessage: 'Trend',
});

const CHART_HEIGHT = 260;
const FIELD_STORAGE_KEY = 'securitySolution.alertsV2.trendStackByField';
const DEFAULT_FIELD = 'rule.id';

/** Builds select options from the discovered fields, keeping the current selection present. */
const toSelectOptions = (fields: string[], selected: string) => {
  const list = selected && !fields.includes(selected) ? [selected, ...fields] : fields;
  return list.map((field) => ({ value: field, text: field }));
};

export interface TrendPanelProps {
  /** The page's ES|QL query — the chart aggregates on top of it. */
  query: AggregateQuery;
  timeRange: TimeRange;
}

/**
 * "Trend" KPI for the Alerts v2 page — episodes over time as a stacked bar
 * histogram, split by a selectable "Stack by" field, from an ES|QL `BUCKET`
 * date histogram rendered with @elastic/charts.
 */
export const TrendPanel = ({ query, timeRange }: TrendPanelProps) => {
  const baseTheme = useElasticChartsTheme();

  const [storedField, setStoredField] = useLocalStorage<string>(FIELD_STORAGE_KEY, DEFAULT_FIELD);
  const field = storedField ?? DEFAULT_FIELD;

  const { fields } = useEpisodeFields(query, timeRange);
  const fieldOptions = useMemo(() => toSelectOptions(fields, field), [fields, field]);

  const { data, isLoading, error, inspect } = useTrendData(query, timeRange, field);

  return (
    <EuiPanel hasBorder hasShadow={false} data-test-subj="alertsV2TrendPanel">
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{TITLE}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSelect
            compressed
            prepend={i18n.translate('xpack.securitySolution.alertsV2.trend.stackBy', {
              defaultMessage: 'Stack by',
            })}
            aria-label={i18n.translate('xpack.securitySolution.alertsV2.trend.stackByAriaLabel', {
              defaultMessage: 'Stack the trend by field',
            })}
            options={fieldOptions}
            value={field}
            onChange={(event) => setStoredField(event.target.value)}
            data-test-subj="alertsV2TrendStackByField"
          />
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EsqlInspectButton inspect={inspect} title={`${TITLE} ${field}`} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {error ? (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="error"
          size="s"
          title={i18n.translate('xpack.securitySolution.alertsV2.trend.error', {
            defaultMessage: 'Unable to load the trend',
          })}
        >
          {error.message}
        </EuiCallOut>
      ) : isLoading && data.length === 0 ? (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ height: CHART_HEIGHT }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : data.length === 0 ? (
        <EuiText size="s" color="subdued" data-test-subj="alertsV2TrendEmpty">
          {i18n.translate('xpack.securitySolution.alertsV2.trend.empty', {
            defaultMessage: 'No alerts in this time range.',
          })}
        </EuiText>
      ) : (
        <Chart size={{ height: CHART_HEIGHT }}>
          <Settings baseTheme={baseTheme} showLegend legendPosition={Position.Bottom} />
          <Axis id="alertsV2TrendBottom" position={Position.Bottom} />
          <Axis id="alertsV2TrendLeft" position={Position.Left} integersOnly />
          <BarSeries
            id="alertsV2Trend"
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="timestamp"
            yAccessors={['value']}
            splitSeriesAccessors={['series']}
            stackAccessors={['timestamp']}
            data={data}
          />
        </Chart>
      )}
    </EuiPanel>
  );
};
