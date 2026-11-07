/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';
import {
  Axis,
  BarSeries,
  Chart,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  niceTimeFormatter,
  type BrushEndListener,
  type ElementClickListener,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import dateMath from '@kbn/datemath';
import { FieldIcon } from '@kbn/field-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EMPTY_OPTION,
  ToolbarSelector,
  type SelectableEntry,
} from '@kbn/shared-ux-toolbar-selector';
import { SIGNIFICANT_EVENT_SEVERITY } from '../../components/ui/severity_badge';
import type {
  InvestigationsSeverityFilter,
  InvestigationsStateFilter,
} from '../../data/investigations/investigations_url';
import { useChartThemes } from '../../hooks/use_chart_themes';
import {
  buildInvestigationsHistogramSeries,
  severityKey,
  type InvestigationsHistogramBreakdown,
} from './investigations_histogram_series';

const NO_BREAKDOWN_LABEL = i18n.translate(
  'xpack.nightshift.investigationsPage.histogramNoBreakdown',
  { defaultMessage: 'No breakdown' }
);

const SEVERITY_BREAKDOWN_LABEL = i18n.translate(
  'xpack.nightshift.investigationsPage.histogramSeverityBreakdown',
  { defaultMessage: 'Severity' }
);

const STATE_BREAKDOWN_LABEL = i18n.translate(
  'xpack.nightshift.investigationsPage.histogramStateBreakdown',
  { defaultMessage: 'State' }
);

const fieldIconCss = css`
  .euiToken {
    vertical-align: middle;
  }
`;

const STATE_COLORS: Record<InvestigationsStateFilter, string> = {
  open: 'primary',
  closed: 'success',
};

export interface InvestigationsHistogramProps {
  investigations: InvestigationSummary[];
  rangeFrom: string;
  rangeTo: string;
  breakdown: InvestigationsHistogramBreakdown;
  onBreakdownChange: (breakdown: InvestigationsHistogramBreakdown) => void;
  onTimeRangeChange: (range: { from: string; to: string }) => void;
  onSeverityFilter: (severity: InvestigationsSeverityFilter) => void;
  onStateFilter: (state: InvestigationsStateFilter) => void;
  stateOf: (investigation: InvestigationSummary) => InvestigationsStateFilter;
}

export function InvestigationsHistogram({
  investigations,
  rangeFrom,
  rangeTo,
  breakdown,
  onBreakdownChange,
  onTimeRangeChange,
  onSeverityFilter,
  onStateFilter,
  stateOf,
}: InvestigationsHistogramProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { baseTheme } = useChartThemes();

  const { fromMs, toMs } = useMemo(() => {
    const from = dateMath.parse(rangeFrom);
    const to = dateMath.parse(rangeTo, { roundUp: true });
    const fallbackTo = Date.now();
    const fallbackFrom = fallbackTo - 30 * 24 * 60 * 60 * 1000;
    return {
      fromMs: from?.isValid() ? from.valueOf() : fallbackFrom,
      toMs: to?.isValid() ? to.valueOf() : fallbackTo,
    };
  }, [rangeFrom, rangeTo]);

  const { series } = useMemo(
    () =>
      buildInvestigationsHistogramSeries({
        investigations,
        fromMs,
        toMs,
        breakdown,
        severityOf: severityKey,
        stateOf,
      }),
    [breakdown, fromMs, investigations, stateOf, toMs]
  );

  const formatTime = useMemo(() => niceTimeFormatter([fromMs, toMs]), [fromMs, toMs]);
  const formatCount = useMemo(
    () => new Intl.NumberFormat(i18n.getLocale(), { maximumFractionDigits: 0 }),
    []
  );

  const seriesColor = useCallback(
    (id: string): string => {
      if (breakdown === 'severity') {
        if (id === 'none') {
          return euiTheme.colors.textSubdued;
        }
        const severity = SIGNIFICANT_EVENT_SEVERITY[id as keyof typeof SIGNIFICANT_EVENT_SEVERITY];
        return severity
          ? euiTheme.colors.severity[severity.color]
          : euiTheme.colors.vis.euiColorVis0;
      }
      if (breakdown === 'state') {
        const token = STATE_COLORS[id as InvestigationsStateFilter];
        if (token === 'success') {
          return euiTheme.colors.success;
        }
        if (token === 'primary') {
          return euiTheme.colors.primary;
        }
        return euiTheme.colors.textSubdued;
      }
      return euiTheme.colors.vis.euiColorVis0;
    },
    [breakdown, euiTheme]
  );

  const handleBrushEnd = useCallback<BrushEndListener>(
    ({ x }) => {
      if (!x || x.length < 2) {
        return;
      }
      const [start, end] = x[0] <= x[1] ? x : [x[1], x[0]];
      if (end - start < 1000) {
        return;
      }
      onTimeRangeChange({
        from: new Date(start).toISOString(),
        to: new Date(end).toISOString(),
      });
    },
    [onTimeRangeChange]
  );

  const handleElementClick = useCallback<ElementClickListener>(
    (elements) => {
      const first = elements[0];
      if (!Array.isArray(first)) {
        return;
      }
      const seriesId = String(first[1]?.specId ?? '');
      if (!seriesId || seriesId === 'all') {
        return;
      }
      if (breakdown === 'severity') {
        onSeverityFilter(seriesId as InvestigationsSeverityFilter);
      } else if (breakdown === 'state') {
        onStateFilter(seriesId as InvestigationsStateFilter);
      }
    },
    [breakdown, onSeverityFilter, onStateFilter]
  );

  const breakdownOptions: SelectableEntry[] = useMemo(
    () => [
      {
        key: EMPTY_OPTION,
        value: EMPTY_OPTION,
        label: NO_BREAKDOWN_LABEL,
        checked: breakdown === 'none' ? 'on' : undefined,
      },
      {
        key: 'severity',
        value: 'severity',
        label: SEVERITY_BREAKDOWN_LABEL,
        checked: breakdown === 'severity' ? 'on' : undefined,
        prepend: (
          <span css={fieldIconCss}>
            <FieldIcon type="string" />
          </span>
        ),
      },
      {
        key: 'state',
        value: 'state',
        label: STATE_BREAKDOWN_LABEL,
        checked: breakdown === 'state' ? 'on' : undefined,
        prepend: (
          <span css={fieldIconCss}>
            <FieldIcon type="string" />
          </span>
        ),
      },
    ],
    [breakdown]
  );

  const breakdownButtonLabel =
    breakdown === 'severity' ? (
      <FormattedMessage
        id="xpack.nightshift.investigationsPage.histogramBreakdownBySeverity"
        defaultMessage="Breakdown by {fieldName}"
        values={{ fieldName: SEVERITY_BREAKDOWN_LABEL }}
      />
    ) : breakdown === 'state' ? (
      <FormattedMessage
        id="xpack.nightshift.investigationsPage.histogramBreakdownByState"
        defaultMessage="Breakdown by {fieldName}"
        values={{ fieldName: STATE_BREAKDOWN_LABEL }}
      />
    ) : (
      NO_BREAKDOWN_LABEL
    );

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      data-test-subj="nightshiftInvestigationsHistogram"
      css={css`
        width: 100%;
        min-width: 0;
      `}
    >
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <ToolbarSelector
            data-test-subj="nightshiftInvestigationsHistogramBreakdown"
            data-selected-value={breakdown === 'none' ? undefined : breakdown}
            searchable
            buttonLabel={breakdownButtonLabel}
            popoverTitle={i18n.translate(
              'xpack.nightshift.investigationsPage.histogramBreakdownTitle',
              { defaultMessage: 'Select breakdown field' }
            )}
            options={breakdownOptions}
            onChange={(chosen) => {
              const value = chosen?.value;
              if (!value || value === EMPTY_OPTION) {
                onBreakdownChange('none');
                return;
              }
              if (value === 'severity' || value === 'state') {
                onBreakdownChange(value);
              }
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <div
        css={css`
          height: 120px;
          margin-top: ${euiTheme.size.s};
        `}
      >
        <Chart size={{ height: 120 }}>
          <Settings
            baseTheme={baseTheme}
            showLegend={breakdown !== 'none'}
            legendPosition={Position.Right}
            locale={i18n.getLocale()}
            onBrushEnd={handleBrushEnd}
            onElementClick={handleElementClick}
            theme={{
              chartMargins: { left: 8, right: 8, top: 4, bottom: 4 },
            }}
          />
          <Tooltip />
          <Axis
            id="count"
            title={i18n.translate('xpack.nightshift.investigationsPage.histogramCountAxis', {
              defaultMessage: 'Count',
            })}
            position={Position.Left}
            tickFormat={(value) => formatCount.format(value)}
          />
          <Axis id="time" position={Position.Bottom} tickFormat={formatTime} />
          {series.map(({ id, name, data }) => (
            <BarSeries
              key={id}
              id={id}
              name={name}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="x"
              yAccessors={['y']}
              stackAccessors={breakdown === 'none' ? undefined : ['x']}
              data={data}
              color={seriesColor(id)}
              enableHistogramMode
              yNice
            />
          ))}
        </Chart>
      </div>
      <EuiText
        size="xs"
        color="subdued"
        textAlign="center"
        css={css`
          margin-top: ${euiTheme.size.xs};
        `}
      >
        {formatTime(fromMs)} — {formatTime(toMs)}
      </EuiText>
    </EuiPanel>
  );
}
