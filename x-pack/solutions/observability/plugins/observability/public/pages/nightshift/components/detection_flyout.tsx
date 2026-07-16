/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import {
  Axis,
  BarSeries,
  Chart,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  TooltipType,
} from '@elastic/charts';
import moment from 'moment';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { i18n } from '@kbn/i18n';
import type {
  ChangePointType,
  LifecycleDetection,
  SignificantEvent,
} from '@kbn/significant-events-schema';
import { getChangePointLabel, generateChangePointSeries } from '../change_point';
import { formatTimestamp } from '../format_timestamp';
import { useChartThemes } from '../../../hooks/use_chart_themes';
import { useKibana } from '../../../utils/kibana_react';

type EventEvidence = NonNullable<SignificantEvent['evidences']>[number];

export interface DetectionFlyoutProps {
  detection: LifecycleDetection;
  /** Evidence collected by the discovery agent for this detection's rule, if any. */
  evidence?: EventEvidence;
  onClose: () => void;
}

const TREND_POINTS = 28;
const TREND_POINT_INTERVAL_MS = 60_000;
const TREND_CHART_HEIGHT = 160;
// Scales the generated 0-1 series into count-like values for the y-axis.
const TREND_VALUE_SCALE = 25;

function getStreamTypeLabel(streamName?: string): string {
  if (streamName?.startsWith('metrics')) {
    return i18n.translate('xpack.observability.nightshift.detectionFlyout.trend.metricsLabel', {
      defaultMessage: '[Metrics]',
    });
  }
  return i18n.translate('xpack.observability.nightshift.detectionFlyout.trend.logsLabel', {
    defaultMessage: '[Logs]',
  });
}

// TODO: replace with a Lens embeddable once detections expose a real
// occurrence timeseries; until then this renders the illustrative series.
function TrendChart({
  changePointType,
  streamName,
  endTime,
}: {
  changePointType?: ChangePointType;
  streamName?: string;
  endTime: string;
}) {
  const { euiTheme } = useEuiTheme();
  const { baseTheme } = useChartThemes();

  const data = useMemo(() => {
    const end = new Date(endTime).getTime();
    return generateChangePointSeries(changePointType, TREND_POINTS).map(({ x, y }) => ({
      x: end - (TREND_POINTS - 1 - x) * TREND_POINT_INTERVAL_MS,
      y: Math.round(y * TREND_VALUE_SCALE),
    }));
  }, [changePointType, endTime]);

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="s">
      <EuiText size="xs">
        {`${getStreamTypeLabel(streamName)} ${getChangePointLabel(changePointType)}`}
      </EuiText>
      <EuiSpacer size="s" />
      <Chart size={{ height: TREND_CHART_HEIGHT }}>
        <Tooltip type={TooltipType.None} />
        <Settings
          baseTheme={baseTheme}
          theme={{ background: { color: 'transparent' } }}
          showLegend={false}
          locale={i18n.getLocale()}
        />
        <Axis
          id="left"
          position={Position.Left}
          title={i18n.translate(
            'xpack.observability.nightshift.detectionFlyout.trend.valueAxisLabel',
            { defaultMessage: 'value' }
          )}
          ticks={4}
        />
        <Axis
          id="bottom"
          position={Position.Bottom}
          tickFormat={(value) => moment(value).format('HH:mm')}
          ticks={4}
        />
        <BarSeries
          id="detection-trend"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          data={data}
          xAccessor="x"
          yAccessors={['y']}
          color={euiTheme.colors.vis.euiColorVis0}
        />
      </Chart>
    </EuiPanel>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <EuiTitle size="xs">
      <h3>{children}</h3>
    </EuiTitle>
  );
}

export function DetectionFlyout({
  detection,
  evidence,
  onClose,
}: DetectionFlyoutProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const {
    http: { basePath },
    share,
  } = useKibana().services;

  const title = detection.rule_name ?? detection.detection_id;
  const changePointLabel = getChangePointLabel(detection.change_point_type);

  const discoverHref = useMemo(() => {
    if (!evidence?.esql_query) {
      return undefined;
    }
    return share.url.locators
      .get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR)
      ?.getRedirectUrl({ query: { esql: evidence.esql_query } });
  }, [share, evidence]);

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      session="inherit"
      aria-label={title}
      data-test-subj="nightshiftDetectionFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>{title}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiBadge color="default">
              {i18n.translate('xpack.observability.nightshift.detectionFlyout.detectionBadge', {
                defaultMessage: 'Detection',
              })}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="default">{changePointLabel}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          {formatTimestamp(detection['@timestamp'])}
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {evidence?.description && (
          <>
            <SectionTitle>
              {i18n.translate('xpack.observability.nightshift.detectionFlyout.summaryTitle', {
                defaultMessage: 'Summary',
              })}
            </SectionTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" data-test-subj="nightshiftDetectionFlyoutSummary">
              <p>{evidence.description}</p>
            </EuiText>
            <EuiSpacer size="l" />
          </>
        )}

        {detection.stream_name && (
          <>
            <SectionTitle>
              {i18n.translate('xpack.observability.nightshift.detectionFlyout.entitiesTitle', {
                defaultMessage: 'Associated entities',
              })}
            </SectionTitle>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s" wrap responsive={false}>
              <EuiFlexItem grow={false}>
                <a
                  href={basePath.prepend(`/app/streams/${detection.stream_name}`)}
                  data-test-subj="nightshiftDetectionFlyoutEntityChip"
                  css={css`
                    align-items: center;
                    background: ${euiTheme.colors.backgroundBasePlain};
                    border: ${euiTheme.border.thin};
                    border-radius: ${euiTheme.size.l};
                    color: ${euiTheme.colors.textParagraph};
                    display: inline-flex;
                    gap: ${euiTheme.size.xs};
                    padding: ${euiTheme.size.xs} calc(${euiTheme.size.s} + ${euiTheme.size.xxs});
                    transition: background 0.15s;

                    &:hover {
                      background: ${euiTheme.colors.backgroundBaseSubdued};
                      text-decoration: none;
                    }
                  `}
                >
                  <EuiText size="xs">{detection.stream_name}</EuiText>
                  <EuiIcon type="arrowRight" size="s" color="subdued" aria-hidden={true} />
                </a>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="l" />
          </>
        )}

        <SectionTitle>
          {i18n.translate('xpack.observability.nightshift.detectionFlyout.trendTitle', {
            defaultMessage: 'Trend',
          })}
        </SectionTitle>
        <EuiSpacer size="s" />
        <TrendChart
          changePointType={detection.change_point_type}
          streamName={detection.stream_name}
          endTime={detection['@timestamp']}
        />

        {evidence?.esql_query && (
          <>
            <EuiSpacer size="l" />
            <EuiFlexGroup
              alignItems="center"
              justifyContent="spaceBetween"
              responsive={false}
              gutterSize="s"
            >
              <EuiFlexItem grow={false}>
                <SectionTitle>
                  {i18n.translate('xpack.observability.nightshift.detectionFlyout.esqlTitle', {
                    defaultMessage: 'ES|QL query',
                  })}
                </SectionTitle>
              </EuiFlexItem>
              {discoverHref && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    href={discoverHref}
                    size="xs"
                    iconType="discoverApp"
                    data-test-subj="nightshiftDetectionFlyoutDiscoverLink"
                  >
                    {i18n.translate(
                      'xpack.observability.nightshift.detectionFlyout.openInDiscoverLinkText',
                      { defaultMessage: 'Open in Discover' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiCodeBlock
              language="sql"
              fontSize="s"
              paddingSize="m"
              isCopyable
              overflowHeight={220}
              data-test-subj="nightshiftDetectionFlyoutEsql"
            >
              {evidence.esql_query}
            </EuiCodeBlock>
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
