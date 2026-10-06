/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiLoadingSpinner,
  EuiNotificationBadge,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import {
  AreaSeries,
  Axis,
  Chart,
  ColorVariant,
  CurveType,
  PointShape,
  Position,
  ScaleType,
  Settings,
  TextureShape,
  Tooltip,
  TooltipType,
  type AreaSeriesStyle,
  type RecursivePartial,
} from '@elastic/charts';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { useChartThemes } from '../../hooks/use_chart_themes';

export type RunStatus = 'succeeded' | 'running' | 'failed' | 'skipped';
export interface Run {
  id: string;
  status: RunStatus;
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  triggeredBy?: string;
  title?: string;
  message?: string;
  investigationId?: string;
  skipReason?: string | null;
  dailyLimit?: number;
}

export const statusLabels: Record<RunStatus, string> = {
  succeeded: i18n.translate('xpack.nightshift.automations.detail.succeeded', {
    defaultMessage: 'Succeeded',
  }),
  running: i18n.translate('xpack.nightshift.automations.detail.running', {
    defaultMessage: 'Running',
  }),
  failed: i18n.translate('xpack.nightshift.automations.detail.failed', {
    defaultMessage: 'Failed',
  }),
  skipped: i18n.translate('xpack.nightshift.automations.detail.skipped', {
    defaultMessage: 'Skipped',
  }),
};

const labels = {
  noRuns: i18n.translate('xpack.nightshift.automations.detail.noRuns', {
    defaultMessage: 'No runs in the last 48 hours',
  }),
  noRunsBody: i18n.translate('xpack.nightshift.automations.detail.noRunsBody', {
    defaultMessage: 'Runs show up here each time a trigger fires.',
  }),
  noFilteredRuns: i18n.translate('xpack.nightshift.automations.detail.noFilteredRuns', {
    defaultMessage: 'No runs match this filter.',
  }),
  previousDay: i18n.translate('xpack.nightshift.automations.detail.yesterday', {
    defaultMessage: 'Yesterday',
  }),
  today: i18n.translate('xpack.nightshift.automations.detail.today', { defaultMessage: 'Today' }),
  automationRun: i18n.translate('xpack.nightshift.automations.detail.automationRun', {
    defaultMessage: 'Automation run',
  }),
  runsLast48Hours: i18n.translate('xpack.nightshift.automations.detail.runsLast48Hours', {
    defaultMessage: 'runs · Last 48 hours',
  }),
  trigger: i18n.translate('xpack.nightshift.automations.detail.trigger', {
    defaultMessage: 'Trigger',
  }),
  runs: i18n.translate('xpack.nightshift.automations.detail.runs', { defaultMessage: 'runs' }),
};

export const STATUSES: RunStatus[] = ['succeeded', 'running', 'failed', 'skipped'];
const STATUS_VIS_COLOR = {
  succeeded: 'euiColorVisSuccess0',
  running: 'euiColorVisNeutral0',
  failed: 'euiColorVisDanger0',
  skipped: 'euiColorVisWarning0',
} as const;
const STATUS_TONE = {
  succeeded: 'Success',
  running: 'Primary',
  failed: 'Danger',
  skipped: 'Warning',
} as const;
const STATUS_HEALTH_COLOR = { succeeded: 'success', running: 'primary', failed: 'danger' } as const;
const CHART_HEIGHT = 180;
const BUCKET_MS = 4 * 60 * 60 * 1000;

const seriesStyle = (status: RunStatus): RecursivePartial<AreaSeriesStyle> =>
  status === 'skipped'
    ? {
        area: {
          opacity: 0.22,
          texture: {
            shape: TextureShape.Line,
            stroke: ColorVariant.Series,
            strokeWidth: 1.25,
            rotation: -45,
            size: 6,
            spacing: { x: 5, y: 5 },
            opacity: 1,
          },
        },
        line: { strokeWidth: 1.5 },
        point: { visible: 'never' },
      }
    : {
        point: {
          visible: 'always',
          shape: {
            succeeded: PointShape.Circle,
            running: PointShape.Diamond,
            failed: PointShape.X,
          }[status],
          radius: status === 'failed' ? 4 : 3,
          strokeWidth: status === 'failed' ? 1.5 : 1,
          fill: status === 'failed' ? 'transparent' : ColorVariant.Series,
          stroke: ColorVariant.Series,
          opacity: 1,
        },
      };

const StatusSwatch = ({ status, color }: { status: RunStatus; color: string }) =>
  status === 'skipped' ? (
    <span
      aria-hidden={true}
      css={css`
        display: inline-block;
        inline-size: 12px;
        block-size: 12px;
        border-radius: 2px;
        border: 1px solid ${color};
        background: repeating-linear-gradient(
          -45deg,
          ${color},
          ${color} 1.25px,
          transparent 1.25px,
          transparent 3.5px
        );
      `}
    />
  ) : (
    <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden={true} focusable="false">
      {status === 'succeeded' && <circle cx="6" cy="6" r="4.25" fill={color} />}
      {status === 'running' && <polygon points="6,1.25 10.75,6 6,10.75 1.25,6" fill={color} />}
      {status === 'failed' && (
        <g stroke={color} strokeWidth="1.75" strokeLinecap="round" fill="none">
          <line x1="2.5" y1="2.5" x2="9.5" y2="9.5" />
          <line x1="9.5" y1="2.5" x2="2.5" y2="9.5" />
        </g>
      )}
    </svg>
  );

const StatusPill = ({
  status,
  count,
  isSelected,
  onClick,
}: {
  status: RunStatus;
  count: number;
  isSelected: boolean;
  onClick: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const { colors } = euiTheme;
  const tone = STATUS_TONE[status];
  const border = isSelected ? colors[`borderStrong${tone}`] : colors.borderBasePlain;
  const background = isSelected ? colors[`backgroundBase${tone}`] : colors.backgroundBasePlain;
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      data-test-subj={`automationRunFilter-${status}`}
      onClick={onClick}
      css={css`
        display: inline-flex;
        align-items: center;
        gap: ${euiTheme.size.xs};
        block-size: ${euiTheme.size.xl};
        padding-inline: ${euiTheme.size.m} ${euiTheme.size.s};
        border-radius: 9999px;
        border: ${euiTheme.border.width.thin} solid ${border};
        background: ${background};
        color: ${colors.textParagraph};
        font-size: ${euiTheme.font.scale.s * euiTheme.base}px;
        font-weight: ${isSelected ? euiTheme.font.weight.bold : euiTheme.font.weight.medium};
        transition: background ${euiTheme.animation.fast} ease,
          border-color ${euiTheme.animation.fast} ease;
        &:hover,
        &:focus-visible {
          background: ${isSelected ? background : colors.backgroundBaseInteractiveHover};
          border-color: ${isSelected ? border : euiTheme.components.forms.borderHovered};
        }
      `}
    >
      <StatusSwatch status={status} color={colors.vis[STATUS_VIS_COLOR[status]]} />
      {statusLabels[status]}
      <EuiNotificationBadge
        color="subdued"
        size="m"
        css={
          isSelected && {
            backgroundColor: colors[`backgroundLight${tone}`],
            color: colors[`text${tone}`],
          }
        }
      >
        {count}
      </EuiNotificationBadge>
    </button>
  );
};

const toBuckets = (runs: Run[], startMs: number, endMs: number) => {
  const buckets = Array.from({ length: Math.floor((endMs - startMs) / BUCKET_MS) + 1 }, (_, i) => ({
    time: startMs + i * BUCKET_MS,
    succeeded: 0,
    running: 0,
    failed: 0,
    skipped: 0,
  }));
  runs.forEach(({ status, startedAt }) => {
    const index = Math.floor((Date.parse(startedAt) - startMs) / BUCKET_MS);
    buckets[Math.min(Math.max(index, 0), buckets.length - 1)][status] += 1;
  });
  return buckets;
};

const formatDay = (dayStart: number) => {
  const today = moment().startOf('day');
  if (dayStart === today.valueOf()) return labels.today;
  if (dayStart === today.subtract(1, 'day').valueOf()) return labels.previousDay;
  return new Date(dayStart).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

export const RunStatusIndicator = ({ status }: { status: RunStatus }) => {
  const { euiTheme } = useEuiTheme();
  if (status !== 'skipped') {
    return (
      <EuiHealth color={STATUS_HEALTH_COLOR[status]} textSize="xs">
        {statusLabels[status]}
      </EuiHealth>
    );
  }
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} component="span">
      <EuiFlexItem grow={false} component="span">
        <EuiIcon
          type="hourglass"
          size="s"
          color={euiTheme.colors.vis.euiColorVisWarning0}
          aria-hidden={true}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} component="span">
        <EuiText size="xs">{statusLabels.skipped}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const RunHistory = ({
  runs,
  isLoading,
  startedAfter,
  startedBefore,
  automationName,
  initialFilter,
  onSelect,
}: {
  runs: Run[];
  isLoading: boolean;
  startedAfter: string;
  startedBefore: string;
  automationName: string;
  initialFilter?: RunStatus;
  onSelect: (run: Run) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const { baseTheme } = useChartThemes();
  const [filter, setFilter] = useState(initialFilter);
  if (isLoading) return <EuiLoadingSpinner size="l" />;
  if (!runs.length)
    return (
      <EuiEmptyPrompt
        titleSize="xs"
        title={<h3>{labels.noRuns}</h3>}
        body={<p>{labels.noRunsBody}</p>}
      />
    );

  const startMs = Date.parse(startedAfter);
  const endMs = Date.parse(startedBefore);
  const visibleRuns = filter ? runs.filter(({ status }) => status === filter) : runs;
  const counts = STATUSES.map((status) => ({
    status,
    count: runs.filter((run) => run.status === status).length,
  })).filter(({ count, status }) => count > 0 || status === filter);
  const baseline = toBuckets(runs, startMs, endMs);
  const buckets = toBuckets(visibleRuns, startMs, endMs);
  const peak = Math.max(
    0,
    ...baseline.map((bucket) => STATUSES.reduce((sum, status) => sum + bucket[status], 0))
  );
  const yMax = peak + (peak <= 2 ? 1 : Math.ceil(peak * 0.25));
  const dayStart = (run: Run) => moment(run.startedAt).startOf('day').valueOf();
  const groups = [...new Set(visibleRuns.map(dayStart))].map((day) => ({
    day,
    runs: visibleRuns.filter((run) => dayStart(run) === day),
  }));

  return (
    <>
      <section
        css={css`
          position: sticky;
          inset-block-start: 0;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.s};
          padding-block: ${euiTheme.size.s} ${euiTheme.size.l};
          border-block-end: ${euiTheme.border.thin};
          background: ${euiTheme.colors.backgroundBasePlain};
        `}
      >
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false} wrap>
              {counts.map(({ status, count }) => (
                <EuiFlexItem key={status} grow={false}>
                  <StatusPill
                    status={status}
                    count={count}
                    isSelected={filter === status}
                    onClick={() => setFilter(filter === status ? undefined : status)}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued" css={{ whiteSpace: 'nowrap' }}>
              {runs.filter(({ status }) => status !== 'skipped').length} {labels.runsLast48Hours}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <Chart size={{ height: CHART_HEIGHT }}>
          <Settings
            baseTheme={baseTheme}
            showLegend={false}
            locale={i18n.getLocale()}
            theme={{
              background: { color: 'transparent' },
              chartMargins: { left: 2, right: 2, top: 8, bottom: 2 },
            }}
          />
          <Tooltip
            type={TooltipType.VerticalCursor}
            headerFormatter={({ value }) =>
              `${moment(value).format('ddd, MMM D, HH:mm')} – ${moment(value)
                .add(BUCKET_MS)
                .format('HH:mm')}`
            }
          />
          <Axis
            id="bottom"
            position={Position.Bottom}
            timeAxisLayerCount={0}
            gridLine={{ visible: false }}
            tickFormat={(value) =>
              moment(value).format(
                moment(value).isSame(moment(value).startOf('day')) ? 'MMM D' : 'HH:mm'
              )
            }
          />
          <Axis
            id="left"
            position={Position.Left}
            integersOnly
            domain={{ min: 0, max: yMax }}
            gridLine={{ visible: true }}
          />
          {STATUSES.filter((status) => buckets.some((bucket) => bucket[status] > 0)).map(
            (status) => (
              <AreaSeries
                key={status}
                id={status}
                name={statusLabels[status]}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor="time"
                yAccessors={[status]}
                data={buckets}
                stackAccessors={['time']}
                curve={CurveType.CURVE_MONOTONE_X}
                color={euiTheme.colors.vis[STATUS_VIS_COLOR[status]]}
                areaSeriesStyle={seriesStyle(status)}
                pointStyleAccessor={(datum) =>
                  datum.initialY1 ? null : { radius: 0, opacity: 0, strokeWidth: 0 }
                }
              />
            )
          )}
        </Chart>
      </section>
      <section
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.l};
          padding-block: ${euiTheme.size.l} ${euiTheme.size.s};
        `}
      >
        {!visibleRuns.length ? (
          <EuiText size="s" color="subdued">
            {labels.noFilteredRuns}
          </EuiText>
        ) : (
          groups.map(({ day, runs: dayRuns }) => (
            <div
              key={day}
              css={css`
                display: flex;
                flex-direction: column;
                gap: ${euiTheme.size.s};
              `}
            >
              <EuiFlexGroup gutterSize="xs" alignItems="baseline" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    <strong>{formatDay(day)}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {dayRuns.length} {labels.runs}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiPanel
                hasBorder
                hasShadow={false}
                paddingSize="none"
                css={{ borderRadius: euiTheme.border.radius.small, overflow: 'hidden' }}
              >
                {dayRuns.map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    data-test-subj="automationRunRow"
                    onClick={() => onSelect(run)}
                    css={css`
                      display: block;
                      inline-size: 100%;
                      padding: ${euiTheme.size.s} ${euiTheme.size.m};
                      text-align: start;
                      &:not(:first-child) {
                        border-block-start: ${euiTheme.border.thin};
                      }
                      &:hover,
                      &:focus-visible {
                        background: ${euiTheme.colors.backgroundBaseInteractiveHover};
                      }
                    `}
                  >
                    <EuiFlexGroup
                      gutterSize="xs"
                      alignItems="center"
                      responsive={false}
                      css={{ minBlockSize: `calc(${euiTheme.size.base} + ${euiTheme.size.xs})` }}
                    >
                      <EuiFlexItem grow={false}>
                        <RunStatusIndicator status={run.status} />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="subdued">
                          · {moment(run.startedAt).fromNow()}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiText size="s" className="eui-textTruncate">
                      <strong>{run.title || labels.automationRun}</strong>
                    </EuiText>
                    <EuiText size="xs" color="subdued" className="eui-textTruncate">
                      {run.status === 'skipped'
                        ? i18n.translate('xpack.nightshift.automations.detail.skippedRunSummary', {
                            defaultMessage: '{source} · Daily trigger limit of {limit} reached',
                            values: {
                              source: run.triggeredBy ?? labels.trigger,
                              limit: run.dailyLimit ?? '—',
                            },
                          })
                        : automationName}
                    </EuiText>
                  </button>
                ))}
              </EuiPanel>
            </div>
          ))
        )}
      </section>
    </>
  );
};
