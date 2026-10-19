/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
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
  CurveType,
  PointerEventType,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  TooltipType,
  type PointerEvent,
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
  noRunsBody: i18n.translate('xpack.nightshift.automations.detail.noRunsBody', {
    defaultMessage:
      'Runs show up here each time a trigger fires. To look further back, change the time range above the automations list.',
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
  trigger: i18n.translate('xpack.nightshift.automations.detail.trigger', {
    defaultMessage: 'Trigger',
  }),
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
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const DAY_HIGHLIGHT_MS = 1200;
const DAY_SCROLL_GAP_PX = 16;
const AREA_SERIES_STYLE = {
  area: { opacity: 0.22 },
  line: { strokeWidth: 1.5 },
  point: { visible: 'never' },
} as const;

const pickBucketMs = (windowMs: number) => {
  const raw = Math.max(1, windowMs / HOUR_MS) / 12;
  return ([1, 2, 4, 6, 12].find((hours) => raw <= hours) ?? 24) * HOUR_MS;
};

const SWATCH_ICON = { succeeded: 'check', failed: 'cross', skipped: 'hourglass' } as const;

const StatusSwatch = ({ status, color }: { status: RunStatus; color: string }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <span
      aria-hidden={true}
      css={{
        display: 'inline-flex',
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        inlineSize: euiTheme.size.m,
        blockSize: euiTheme.size.m,
      }}
    >
      {status === 'running' ? (
        <svg width={12} height={12} viewBox="0 0 16 16" focusable="false">
          <polygon points="8,2 14,8 8,14 2,8" fill={color} />
        </svg>
      ) : (
        <EuiIcon type={SWATCH_ICON[status]} size="m" color={color} aria-hidden={true} />
      )}
    </span>
  );
};

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

const toBuckets = (runs: Run[], startMs: number, endMs: number, bucketMs: number) => {
  const buckets = Array.from(
    { length: Math.max(0, Math.floor((endMs - startMs) / bucketMs)) + 1 },
    (_, i) => ({
      time: startMs + i * bucketMs,
      succeeded: 0,
      running: 0,
      failed: 0,
      skipped: 0,
    })
  );
  runs.forEach(({ status, startedAt }) => {
    const index = Math.floor((Date.parse(startedAt) - startMs) / bucketMs);
    buckets[Math.min(Math.max(index, 0), buckets.length - 1)][status] += 1;
  });
  return buckets;
};

const formatDay = (dayStart: number) => {
  const today = moment().startOf('day');
  if (dayStart === today.valueOf()) return labels.today;
  if (dayStart === today.clone().subtract(1, 'day').valueOf()) return labels.previousDay;
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
  rangeLabel,
  automationName,
  initialFilter,
  onSelect,
}: {
  runs: Run[];
  isLoading: boolean;
  startedAfter: string;
  startedBefore: string;
  rangeLabel: string;
  automationName: string;
  initialFilter?: RunStatus;
  onSelect: (run: Run) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const { baseTheme } = useChartThemes();
  const [filter, setFilter] = useState(initialFilter);
  const [hoveredBucketMs, setHoveredBucketMs] = useState<number>();
  const [highlightedDay, setHighlightedDay] = useState<number>();
  const summaryRef = useRef<HTMLElement>(null);
  const dayNodesRef = useRef(new Map<number, HTMLDivElement>());
  const timersRef = useRef<number[]>([]);
  useEffect(() => () => timersRef.current.forEach((id) => window.clearTimeout(id)), []);

  if (isLoading) return <EuiLoadingSpinner size="l" />;
  if (!runs.length)
    return (
      <EuiEmptyPrompt
        titleSize="xs"
        title={
          <h3>
            {i18n.translate('xpack.nightshift.automations.detail.noRuns', {
              defaultMessage: 'No runs in the {range}',
              values: { range: rangeLabel.toLowerCase() },
            })}
          </h3>
        }
        body={<p>{labels.noRunsBody}</p>}
      />
    );

  const startMs = Date.parse(startedAfter);
  const endMs = Date.parse(startedBefore);
  const bucketMs = pickBucketMs(endMs - startMs);
  const visibleRuns = filter ? runs.filter(({ status }) => status === filter) : runs;
  const counts = STATUSES.map((status) => ({
    status,
    count: runs.filter((run) => run.status === status).length,
  })).filter(({ count, status }) => count > 0 || status === filter);
  const baseline = toBuckets(runs, startMs, endMs, bucketMs);
  const buckets = toBuckets(visibleRuns, startMs, endMs, bucketMs);
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
  const startedRuns = runs.filter(({ status }) => status !== 'skipped').length;

  const handlePointerUpdate = (event: PointerEvent) =>
    setHoveredBucketMs(
      event.type === PointerEventType.Over && typeof event.x === 'number' ? event.x : undefined
    );

  const jumpToDay = (bucketStartMs: number) => {
    const midpointMs = bucketStartMs + bucketMs / 2;
    const group =
      groups.find(({ day }) => day <= midpointMs && midpointMs < day + DAY_MS) ??
      groups.find(({ day }) => day < bucketStartMs + bucketMs && bucketStartMs < day + DAY_MS);
    const node = group && dayNodesRef.current.get(group.day);
    if (!group || !node) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    node.style.scrollMarginTop = `${(summaryRef.current?.offsetHeight ?? 0) + DAY_SCROLL_GAP_PX}px`;
    node.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    timersRef.current.forEach((id) => window.clearTimeout(id));
    setHighlightedDay(undefined);
    const delay = reduceMotion ? 50 : 400;
    timersRef.current = [
      window.setTimeout(() => setHighlightedDay(group.day), delay),
      window.setTimeout(() => setHighlightedDay(undefined), delay + DAY_HIGHLIGHT_MS),
    ];
  };

  return (
    <>
      <section
        ref={summaryRef}
        css={css`
          position: sticky;
          inset-block-start: 0;
          z-index: calc(${euiTheme.levels.content} + 1);
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.s};
          margin: -${euiTheme.size.base} -${euiTheme.size.base} 0;
          padding: ${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.l};
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
              {i18n.translate('xpack.nightshift.automations.detail.runsSummary', {
                defaultMessage: '{count, plural, one {# run} other {# runs}} · {range}',
                values: { count: startedRuns, range: rangeLabel },
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <div
          role="presentation"
          css={{ cursor: hoveredBucketMs === undefined ? 'default' : 'pointer' }}
          onClick={() => hoveredBucketMs !== undefined && jumpToDay(hoveredBucketMs)}
        >
          <Chart size={{ height: CHART_HEIGHT }}>
            <Settings
              baseTheme={baseTheme}
              showLegend={false}
              locale={i18n.getLocale()}
              theme={{
                background: { color: 'transparent' },
                chartMargins: { left: 2, right: 2, top: 8, bottom: 2 },
              }}
              onPointerUpdate={handlePointerUpdate}
            />
            <Tooltip
              type={TooltipType.VerticalCursor}
              headerFormatter={({ value }) =>
                `${moment(value).format('ddd, MMM D, HH:mm')} – ${moment(value)
                  .add(bucketMs)
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
                  areaSeriesStyle={AREA_SERIES_STYLE}
                />
              )
            )}
          </Chart>
        </div>
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
          groups.map(({ day, runs: dayRuns }) => {
            const skipped = dayRuns.filter(({ status }) => status === 'skipped').length;
            const started = dayRuns.length - skipped;
            return (
              <div
                key={day}
                ref={(node) => {
                  if (node) dayNodesRef.current.set(day, node);
                  else dayNodesRef.current.delete(day);
                }}
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
                      {[
                        started > 0 &&
                          i18n.translate('xpack.nightshift.automations.detail.dayRuns', {
                            defaultMessage: '{count, plural, one {# run} other {# runs}}',
                            values: { count: started },
                          }),
                        skipped > 0 &&
                          i18n.translate('xpack.nightshift.automations.detail.daySkipped', {
                            defaultMessage: '{count} skipped',
                            values: { count: skipped },
                          }),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiPanel
                  hasBorder
                  hasShadow={false}
                  paddingSize="none"
                  css={{
                    borderRadius: euiTheme.border.radius.small,
                    overflow: 'hidden',
                    borderColor: highlightedDay === day ? euiTheme.colors.primary : undefined,
                  }}
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
                          ? i18n.translate(
                              'xpack.nightshift.automations.detail.skippedRunSummary',
                              {
                                defaultMessage: '{source} · Daily trigger limit of {limit} reached',
                                values: {
                                  source: run.triggeredBy ?? labels.trigger,
                                  limit: run.dailyLimit ?? '—',
                                },
                              }
                            )
                          : automationName}
                      </EuiText>
                    </button>
                  ))}
                </EuiPanel>
              </div>
            );
          })
        )}
      </section>
    </>
  );
};
