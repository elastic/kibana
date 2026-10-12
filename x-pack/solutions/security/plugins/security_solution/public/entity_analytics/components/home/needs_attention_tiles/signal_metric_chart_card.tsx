/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { Chart, Metric, Settings } from '@elastic/charts';
import type {
  MetricWNumber,
  MetricWText,
  MetricWTrend,
  SecondaryMetricProps,
} from '@elastic/charts';
import { EuiLoadingSpinner, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import type { SignalCardData } from './data';
import { getDeltaPercentage } from './delta_percentage';

const DIMMED_OPACITY = 0.7;
const TREND_UP = '↑';
const TREND_DOWN = '↓';

const vsPreviousPeriod = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.signalMetricChartCard.vsPreviousPeriod',
  { defaultMessage: 'vs previous period' }
);

interface DatumColors {
  tile: string;
  increaseBadge: string;
  increaseText: string;
  decreaseBadge: string;
  decreaseText: string;
}

/**
 * Maps a Needs-attention card to a datum of the EUI charts `Metric` chart: title, description as
 * the subtitle, the value, the delta as the secondary metric and the trend as a step area.
 */
export const buildSignalMetricDatum = (
  card: SignalCardData,
  colors: DatumColors
): MetricWNumber | MetricWText | MetricWTrend => {
  const isLoading = card.isLoading ?? false;
  const isZero = card.value === 0;

  const base = { title: card.title, subtitle: card.description, color: colors.tile };

  if (isLoading) {
    return { ...base, value: '—', extra: <EuiLoadingSpinner size="m" /> };
  }

  if (isZero) {
    return {
      ...base,
      value: '—',
      extra: card.noDataMessage ? (
        <EuiText size="xs" color="subdued">
          {card.noDataMessage}
        </EuiText>
      ) : undefined,
    };
  }

  let extra: SecondaryMetricProps | React.ReactElement | undefined;
  if (card.isDeltaLoading) {
    extra = (
      <span>
        <EuiLoadingSpinner size="s" /> {vsPreviousPeriod}
      </span>
    );
  } else if (card.delta !== undefined && card.delta !== 0) {
    const isPositive = card.delta > 0;
    const sign = isPositive ? '+' : '';
    const percentage = getDeltaPercentage(card.delta, card.value);
    extra = {
      value: `${sign}${card.delta}${percentage !== undefined ? ` (${sign}${percentage}%)` : ''}`,
      label: vsPreviousPeriod,
      labelPosition: 'after',
      // The chart styles the whole row at weight 500; regular keeps the label light.
      style: { fontWeight: 'normal' },
      icon: isPositive ? TREND_UP : TREND_DOWN,
      badgeColor: isPositive ? colors.increaseBadge : colors.decreaseBadge,
      badgeTextColor: isPositive ? colors.increaseText : colors.decreaseText,
    };
  }

  const numberDatum: MetricWNumber = {
    ...base,
    value: card.value,
    valueFormatter: (value) => value.toLocaleString(),
    extra,
  };

  if (!card.trend || card.trend.length < 2) {
    return numberDatum;
  }

  return {
    ...numberDatum,
    trend: card.trend.map((y, x) => ({ x, y })),
    // 'bars' is drawn by the Metric chart as a step-after staircase from zero; 'area' is linear.
    trendShape: 'bars',
    trendA11yTitle: i18n.translate(
      'xpack.securitySolution.entityAnalytics.facelift.signalMetricChartCard.trendA11yTitle',
      { defaultMessage: '{title} over the selected time range.', values: { title: card.title } }
    ),
    trendA11yDescription: i18n.translate(
      'xpack.securitySolution.entityAnalytics.facelift.signalMetricChartCard.trendA11yDescription',
      {
        defaultMessage: 'A step chart of {title} from {first} to {last}. Peak {peak}.',
        values: {
          title: card.title,
          first: card.trend[0],
          last: card.trend[card.trend.length - 1],
          peak: Math.max(0, ...card.trend),
        },
      }
    ),
  };
};

export interface SignalMetricChartCardProps {
  card: SignalCardData;
  selected: boolean;
  dimmed: boolean;
  onToggle: () => void;
}

/**
 * Spike: a Needs-attention tile drawn with the EUI charts `Metric` chart instead of the custom
 * card. The chart handles hover, focus, the title and subtitle, the delta badge and the trend;
 * the wrapper only adds the selected border, the dimmed state and the filter tooltip.
 */
export const SignalMetricChartCard: React.FC<SignalMetricChartCardProps> = ({
  card,
  selected,
  dimmed,
  onToggle,
}) => {
  const { euiTheme } = useEuiTheme();
  const chartBaseTheme = useElasticChartsTheme();

  const interactive = !(card.value === 0) && !(card.isLoading ?? false);

  const datum = useMemo(
    () =>
      buildSignalMetricDatum(card, {
        tile: euiTheme.colors.backgroundBasePlain,
        increaseBadge: euiTheme.colors.backgroundBaseDanger,
        increaseText: euiTheme.colors.danger,
        decreaseBadge: euiTheme.colors.backgroundBaseSuccess,
        decreaseText: euiTheme.colors.textSuccess,
      }),
    [card, euiTheme]
  );

  const chartNode = (
    <div
      data-test-subj={`eaFaceliftSignalCard-${card.id}`}
      css={css`
        position: relative;
        block-size: 100%;
        /* A floor, so the card never collapses. 160px keeps Metric in the size bracket that shows
           the title, description, count and delta. */
        min-block-size: calc(${euiTheme.size.xxxxl} * 2.5);
        border: 1px solid
          ${selected ? euiTheme.colors.borderStrongPrimary : euiTheme.colors.borderBasePlain};
        border-radius: ${euiTheme.border.radius.medium};
        opacity: ${dimmed ? DIMMED_OPACITY : 1};
        overflow: hidden;
        transition: border-color ${euiTheme.animation.fast} ${euiTheme.animation.resistance},
          opacity ${euiTheme.animation.fast} ${euiTheme.animation.resistance};
      `}
    >
      {/* The chart sizes itself as 100% of its parent, which is only definite when absolutely
          positioned inside the card. */}
      <div
        css={css`
          position: absolute;
          inset: 0;
        `}
      >
        <Chart>
          <Settings
            baseTheme={chartBaseTheme}
            locale={i18n.getLocale()}
            // 'middle': title, description, then the count, then the delta below it. The default
            // ('bottom') puts the delta above the count.
            // The delta label takes the chart's own text colour by default; make it subdued grey.
            theme={{
              metric: {
                valuePosition: 'middle',
                textExtraLightColor: euiTheme.colors.textSubdued,
                textExtraDarkColor: euiTheme.colors.textSubdued,
              },
            }}
            onElementClick={interactive ? onToggle : undefined}
          />
          <Metric id={`eaSignalMetric-${card.id}`} data={[[datum]]} />
        </Chart>
      </div>
    </div>
  );

  if (!interactive) {
    return chartNode;
  }

  return (
    <EuiToolTip
      content={
        selected
          ? i18n.translate(
              'xpack.securitySolution.entityAnalytics.facelift.signalMetricChartCard.unfilterTooltip',
              { defaultMessage: 'Unfilter table: {title}', values: { title: card.title } }
            )
          : i18n.translate(
              'xpack.securitySolution.entityAnalytics.facelift.signalMetricChartCard.filterTooltip',
              { defaultMessage: 'Filter table: {title}', values: { title: card.title } }
            )
      }
      display="block"
      // Lets the card fill the grid cell; otherwise the anchor is only as tall as its content.
      anchorProps={{
        css: css`
          block-size: 100%;
        `,
      }}
    >
      {chartNode}
    </EuiToolTip>
  );
};
