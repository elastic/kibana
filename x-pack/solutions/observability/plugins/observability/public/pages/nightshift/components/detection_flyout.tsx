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
  AnnotationDomainType,
  Axis,
  BarSeries,
  BubbleSeries,
  Chart,
  LineAnnotation,
  PointShape,
  Position,
  RectAnnotation,
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
  SignalEntry,
} from '@kbn/significant-events-schema';
import {
  getChangePointIndex,
  getChangePointLabel,
  getChangePointTimestamp,
  generateChangePointSeries,
  ILLUSTRATIVE_POINT_INTERVAL_MS,
  ILLUSTRATIVE_SERIES_POINTS,
} from '../change_point';
import { formatTimestamp } from '../format_timestamp';
import { ChangePointAnnotationTooltip } from './change_point_annotation_tooltip';
import { useChartThemes } from '../../../hooks/use_chart_themes';
import { useKibana } from '../../../utils/kibana_react';

export interface DetectionFlyoutProps {
  detection: LifecycleDetection;
  /** Signal collected by the discovery agent for this detection's rule, if any. */
  signal?: SignalEntry;
  onClose: () => void;
}

const TREND_CHART_HEIGHT = 160;
// Room above the tallest bar so the diamond isn't clipped at the canvas edge.
const TREND_MARKER_MARGIN = 10;
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

  const { data, changePointAt, changePointMarker } = useMemo(() => {
    const end = new Date(endTime).getTime();
    const changeIndex = getChangePointIndex(changePointType, ILLUSTRATIVE_SERIES_POINTS);
    const series = generateChangePointSeries(changePointType, ILLUSTRATIVE_SERIES_POINTS).map(
      ({ x, y }) => ({
        x: end - (ILLUSTRATIVE_SERIES_POINTS - 1 - x) * ILLUSTRATIVE_POINT_INTERVAL_MS,
        y: Math.round(y * TREND_VALUE_SCALE),
      })
    );
    const changePointX = getChangePointTimestamp(end, changePointType);
    return {
      data: series,
      // Series is framed so the window ends at the detection timestamp; the
      // annotation marks the synthetic change knee within that window.
      changePointAt: changePointX,
      changePointMarker: [{ x: changePointX, y: series[changeIndex]?.y ?? 0 }],
    };
  }, [changePointType, endTime]);

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="s"
      css={css`
        overflow: visible;
      `}
    >
      <EuiText size="xs">
        {`${getStreamTypeLabel(streamName)} ${getChangePointLabel(changePointType)}`}
      </EuiText>
      <EuiSpacer size="s" />
      <Chart size={{ height: TREND_CHART_HEIGHT }}>
        {/* Series tooltips stay off; the annotation uses its own customTooltip. */}
        <Tooltip type={TooltipType.None} />
        <Settings
          baseTheme={baseTheme}
          theme={{
            background: { color: 'transparent' },
            chartMargins: { top: TREND_MARKER_MARGIN },
          }}
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
        <LineAnnotation
          id="detection-change-point"
          domainType={AnnotationDomainType.XDomain}
          dataValues={[{ dataValue: changePointAt }]}
          style={{
            line: {
              strokeWidth: 2,
              stroke: euiTheme.colors.danger,
              opacity: 1,
            },
          }}
        />
        {/*
          LineAnnotation tooltips only fire on a marker DOM node (not the line).
          A transparent rect gives a hover target along the full annotation.
        */}
        <RectAnnotation
          id="detection-change-point-tooltip"
          zIndex={10}
          dataValues={[
            {
              coordinates: {
                x0: changePointAt - ILLUSTRATIVE_POINT_INTERVAL_MS / 2,
                x1: changePointAt + ILLUSTRATIVE_POINT_INTERVAL_MS / 2,
              },
            },
          ]}
          style={{ fill: euiTheme.colors.danger, opacity: 0 }}
          customTooltip={() => (
            <ChangePointAnnotationTooltip
              changePointLabel={getChangePointLabel(changePointType)}
              timestamp={changePointAt}
            />
          )}
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
        {/* Point marker at the bar tip — LineAnnotation markers only pin to chart edges. */}
        <BubbleSeries
          id="detection-change-point-marker"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          data={changePointMarker}
          xAccessor="x"
          yAccessors={['y']}
          color={euiTheme.colors.danger}
          bubbleSeriesStyle={{
            point: {
              shape: PointShape.Diamond,
              radius: 5,
              fill: euiTheme.colors.danger,
              strokeWidth: 0,
              visible: 'always',
            },
          }}
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
  signal,
  onClose,
}: DetectionFlyoutProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const {
    http: { basePath },
    share,
  } = useKibana().services;

  const title = detection.rule_name ?? detection.detection_id;
  const changePointLabel = getChangePointLabel(detection.change_point_type);

  const esqlQuery = signal?.evidence?.esql_query;

  const discoverHref = useMemo(() => {
    if (!esqlQuery) {
      return undefined;
    }
    return share.url.locators
      .get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR)
      ?.getRedirectUrl({ query: { esql: esqlQuery } });
  }, [share, esqlQuery]);

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
        {signal?.description && (
          <>
            <SectionTitle>
              {i18n.translate('xpack.observability.nightshift.detectionFlyout.summaryTitle', {
                defaultMessage: 'Summary',
              })}
            </SectionTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" data-test-subj="nightshiftDetectionFlyoutSummary">
              <p>{signal.description}</p>
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

        {esqlQuery && (
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
              {esqlQuery}
            </EuiCodeBlock>
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
