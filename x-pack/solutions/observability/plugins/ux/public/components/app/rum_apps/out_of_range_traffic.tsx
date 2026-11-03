/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { BrushEndListener } from '@elastic/charts';
import {
  Axis,
  BarSeries,
  Chart,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
  Tooltip,
} from '@elastic/charts';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  usePrettyDuration,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { DocLinksStart, HttpStart } from '@kbn/core/public';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import { useChartThemes } from '@kbn/observability-shared-plugin/public';
import type { RumAppsSpanResponse } from '../../../../common/rum_span';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { fetchRumAppsSpan } from '../../../services/rest/rum_api';
import { EmptyStateLoading } from '../rum_dashboard/empty_state_loading';
import { formatSessionTrafficAxis, formatSessionTrafficTooltip } from './session_traffic_axis';

const currentRangeAnnotation = i18n.translate('xpack.ux.inventory.outOfRangeCurrentRangeLabel', {
  defaultMessage: 'Selected time range',
});

const outOfRangeDescription = i18n.translate('xpack.ux.inventory.outOfRangeDescription', {
  defaultMessage: 'Sessions exist in other ranges. Drag on the chart to select one.',
});

const lookingMessage = i18n.translate('xpack.ux.inventory.outOfRangeLoadingMessage', {
  defaultMessage: 'Looking for sessions in other time ranges…',
});

const emptyRangeTitle = (range: string): string =>
  i18n.translate('xpack.ux.inventory.emptyRangeTitle', {
    defaultMessage: 'No RUM data in {range}',
    values: { range },
  });

const useSelectedRangeLabel = (rangeFrom: string, rangeTo: string): string => {
  const { uiSettings } = useKibanaServices();
  const dateFormat = uiSettings.get<string>('dateFormat') || 'MMM D, YYYY @ HH:mm:ss.SSS';
  const timePickerQuickRanges =
    uiSettings.get<Array<{ from: string; to: string; display: string }>>(
      UI_SETTINGS.TIMEPICKER_QUICK_RANGES
    ) ?? [];
  return usePrettyDuration({
    timeFrom: rangeFrom,
    timeTo: rangeTo,
    dateFormat,
    quickRanges: timePickerQuickRanges.map(({ from, to, display }) => ({
      start: from,
      end: to,
      label: display,
    })),
  });
};

export function useRumAppsSpan({
  enabled,
  http,
  rangeFrom,
  rangeTo,
  includeBots,
  botUa,
}: {
  enabled: boolean;
  http: HttpStart;
  rangeFrom: string;
  rangeTo: string;
  includeBots?: string;
  botUa?: string;
}): { span: RumAppsSpanResponse | null; loading: boolean } {
  const [span, setSpan] = useState<RumAppsSpanResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setSpan(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchRumAppsSpan({ http, rangeFrom, rangeTo, includeBots, botUa })
      .then((result) => {
        if (!cancelled) {
          setSpan(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSpan(null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [botUa, enabled, http, includeBots, rangeFrom, rangeTo]);

  return { span, loading };
}

export function OutOfRangeTrafficChart({
  span,
  onSelectRange,
}: {
  span: RumAppsSpanResponse;
  onSelectRange: (rangeFrom: string, rangeTo: string) => void;
}) {
  const { baseTheme, theme } = useChartThemes();
  const { euiTheme } = useEuiTheme();
  const data = useMemo(
    () => span.points.map((point) => ({ x: point.timestamp, y: point.sessions })),
    [span.points]
  );
  const domainFrom = span.domainFrom ?? span.selectionFrom;
  const domainTo = span.domainTo ?? span.selectionTo;
  const spanMs = Math.max(0, domainTo - domainFrom);
  const locale = i18n.getLocale();
  const tickFormat = (value: number): string => formatSessionTrafficAxis(value, spanMs, locale);
  const tooltipFormat = (value: number): string =>
    formatSessionTrafficTooltip(value, spanMs, locale);
  const onBrushEnd = useCallback<BrushEndListener>(
    ({ x }) => {
      if (!x) {
        return;
      }
      const [from, to] = x;
      if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) {
        return;
      }
      onSelectRange(new Date(from).toISOString(), new Date(to).toISOString());
    },
    [onSelectRange]
  );

  return (
    <div
      css={css`
        height: 160px;
        width: 100%;
      `}
      data-test-subj="uxAppsOutOfRangeChart"
    >
      <Chart size={{ height: 160, width: '100%' }}>
        <Settings
          baseTheme={baseTheme}
          theme={[
            {
              chartMargins: { left: 0, right: 8, top: 8, bottom: 16 },
              chartPaddings: { left: 0, right: 0, top: 0, bottom: 0 },
              background: { color: 'transparent' },
              scales: { barsPadding: 0.18 },
            },
            ...theme,
          ]}
          showLegend={false}
          locale={locale}
          xDomain={{ min: domainFrom, max: domainTo }}
          onBrushEnd={onBrushEnd}
        />
        <Tooltip headerFormatter={({ value }) => tooltipFormat(Number(value))} />
        <RectAnnotation
          id="ux-out-of-range-selection"
          dataValues={[
            {
              coordinates: { x0: span.selectionFrom, x1: span.selectionTo },
              details: currentRangeAnnotation,
            },
          ]}
          style={{
            fill: euiTheme.colors.primary,
            opacity: 0.12,
          }}
        />
        <Axis
          id="ux-out-of-range-y"
          position={Position.Left}
          ticks={3}
          domain={{ min: 0, max: NaN }}
          style={{
            tickLine: { visible: false },
            axisLine: { visible: false },
          }}
        />
        <Axis
          id="ux-out-of-range-x"
          position={Position.Bottom}
          ticks={4}
          timeAxisLayerCount={0}
          tickFormat={(value) => tickFormat(Number(value))}
          showOverlappingLabels={false}
          showOverlappingTicks={false}
          style={{
            tickLine: { visible: false },
            axisLine: { visible: false },
          }}
        />
        <BarSeries
          id="sessions"
          name={i18n.translate('xpack.ux.inventory.sessionTrafficSeriesLabel', {
            defaultMessage: 'Sessions',
          })}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={data}
          enableHistogramMode
          barSeriesStyle={{
            rect: { opacity: 0.85 },
          }}
        />
      </Chart>
    </div>
  );
}

export function InventoryEmptyState({
  span,
  spanLoading,
  onSelectRange,
  rangeFrom,
  rangeTo,
  http,
  docLinks,
}: {
  span: RumAppsSpanResponse | null;
  spanLoading: boolean;
  onSelectRange: (rangeFrom: string, rangeTo: string) => void;
  rangeFrom: string;
  rangeTo: string;
  http: HttpStart;
  docLinks: DocLinksStart;
}) {
  const rangeLabel = useSelectedRangeLabel(rangeFrom, rangeTo);
  const title = emptyRangeTitle(rangeLabel);
  if (spanLoading) {
    return <EmptyStateLoading message={lookingMessage} />;
  }
  if (span?.hasData) {
    return (
      <EuiPanel hasBorder paddingSize="m" data-test-subj="uxAppsOutOfRangePrompt">
        <EuiTitle size="s">
          <h2>{title}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <p>{outOfRangeDescription}</p>
        </EuiText>
        <EuiSpacer />
        <OutOfRangeTrafficChart span={span} onSelectRange={onSelectRange} />
      </EuiPanel>
    );
  }
  return (
    <EuiEmptyPrompt
      data-test-subj="uxAppsEmptyPrompt"
      iconType="chartArea"
      title={<h2>{title}</h2>}
      body={
        <p>
          {i18n.translate('xpack.ux.inventory.emptyDescription', {
            defaultMessage:
              'No instrumented applications reported sessions or page views. Widen the range, or capture traffic with Elastic RUM or EDOT Browser.',
          })}
        </p>
      }
      actions={[
        <EuiButton
          data-test-subj="uxAppsAddRumDataButton"
          href={http.basePath.prepend('/app/apm/tutorial')}
          fill
        >
          {i18n.translate('xpack.ux.inventory.addRumDataButtonLabel', {
            defaultMessage: 'Add RUM data',
          })}
        </EuiButton>,
        <EuiButton
          data-test-subj="uxAppsReadDocsButton"
          href={docLinks.links.observability.guide}
          target="_blank"
        >
          {i18n.translate('xpack.ux.inventory.readDocsButtonLabel', {
            defaultMessage: 'Read the docs',
          })}
        </EuiButton>,
      ]}
    />
  );
}
