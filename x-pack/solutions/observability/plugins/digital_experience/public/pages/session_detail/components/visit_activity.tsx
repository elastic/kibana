/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, type ReactNode } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiIcon,
  EuiText,
  euiPaletteColorBlind,
  useEuiTheme,
  type IconType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { CORE_WEB_VITALS } from '../../../../common/core_web_vitals';
import type { SessionRequest, SessionTimelineEvent } from '../../../../common/sessions';
import { WebVitalBadge } from '../../../components/web_vital_badges';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, SESSIONS_EBT_ELEMENTS } from '../../../ebt_constants';
import { useTraceHref } from '../../../hooks/use_trace_href';
import {
  ACTIVITY_ROW_LIMIT,
  IDLE_GAP_MS,
  axisPercent,
  formatElapsed,
  requestFamilyOf,
  urlWithoutQuery,
  type ActivityRow,
  type RequestFamily,
  type VisitActivity as Activity,
} from '../utils/visit_activity';
import { ErrorDetails, RequestDetails } from './request_details';

const PALETTE = euiPaletteColorBlind();

/** One color per resource type family, the same on every page. */
export const FAMILY_COLORS: Record<RequestFamily, string> = {
  document: PALETTE[0],
  stylesheet: PALETTE[3],
  script: PALETTE[5],
  image: PALETTE[1],
  font: PALETTE[8],
  media: PALETTE[6],
  api: PALETTE[2],
  frame: PALETTE[4],
  other: PALETTE[7],
};

export const FAMILY_LABELS: Record<RequestFamily, string> = {
  document: i18n.translate('xpack.digitalExperience.sessionDetail.activity.documentType', {
    defaultMessage: 'Document',
  }),
  stylesheet: i18n.translate('xpack.digitalExperience.sessionDetail.activity.stylesheetType', {
    defaultMessage: 'CSS',
  }),
  script: i18n.translate('xpack.digitalExperience.sessionDetail.activity.scriptType', {
    defaultMessage: 'JS',
  }),
  image: i18n.translate('xpack.digitalExperience.sessionDetail.activity.imageType', {
    defaultMessage: 'Image',
  }),
  font: i18n.translate('xpack.digitalExperience.sessionDetail.activity.fontType', {
    defaultMessage: 'Font',
  }),
  media: i18n.translate('xpack.digitalExperience.sessionDetail.activity.mediaType', {
    defaultMessage: 'Media',
  }),
  api: i18n.translate('xpack.digitalExperience.sessionDetail.activity.apiType', {
    defaultMessage: 'Fetch/XHR',
  }),
  frame: i18n.translate('xpack.digitalExperience.sessionDetail.activity.frameType', {
    defaultMessage: 'Frame',
  }),
  other: i18n.translate('xpack.digitalExperience.sessionDetail.activity.otherType', {
    defaultMessage: 'Other',
  }),
};

const CACHED_LABEL = i18n.translate('xpack.digitalExperience.sessionDetail.activity.cached', {
  defaultMessage: 'cached',
});

const FAILED_LABEL = i18n.translate('xpack.digitalExperience.sessionDetail.activity.failed', {
  defaultMessage: 'failed',
});

const RENDER_BLOCKING_LABEL = i18n.translate(
  'xpack.digitalExperience.sessionDetail.activity.renderBlocking',
  { defaultMessage: 'blocking' }
);

const NO_ACTIVITY = i18n.translate('xpack.digitalExperience.sessionDetail.activity.empty', {
  defaultMessage: 'Nothing on this page matches the filters.',
});

const EVENT_ICONS: Partial<Record<SessionTimelineEvent['kind'], IconType>> = {
  page_view: 'document',
  click: 'clickLeft',
  error: 'error',
  web_vital: 'visGauge',
};

const EVENT_LABELS: Partial<Record<SessionTimelineEvent['kind'], string>> = {
  page_view: i18n.translate('xpack.digitalExperience.sessionDetail.journey.pageViewLabel', {
    defaultMessage: 'Page view',
  }),
  click: i18n.translate('xpack.digitalExperience.sessionDetail.journey.clickLabel', {
    defaultMessage: 'Click',
  }),
};

/** The URL as short as it reads unambiguously on its page: a path on the page's own origin. */
const displayUrl = (url: string, pageOrigin: string | null): string => {
  if (pageOrigin && url.startsWith(pageOrigin)) {
    return url.slice(pageOrigin.length) || '/';
  }
  return url.replace(/^https?:\/\//, '');
};

const originOf = (url: string | null): string | null => {
  const match = url?.match(/^https?:\/\/[^/?#]+/);
  return match ? match[0] : null;
};

const webVitalOf = ({ kind, name, detail }: SessionTimelineEvent) => {
  const vital = CORE_WEB_VITALS.find((candidate) => candidate === name.toLowerCase());
  const value = Number(detail);
  return kind === 'web_vital' && vital && detail !== null && Number.isFinite(value)
    ? { vital, value }
    : null;
};

const GRID_COLUMNS = (rowGap: string) =>
  css({
    display: 'grid',
    // The label column is capped, so that on wide screens the waterfall gets the extra width.
    gridTemplateColumns: '56px minmax(160px, 32%) minmax(200px, 1fr) 112px',
    columnGap: rowGap,
    alignItems: 'center',
  });

interface Axis {
  originMs: number;
  segments: Activity['segments'];
  milestones: Activity['milestones'];
}

/** The left offset and width, in percent, of the span from `startMs` to `endMs` (absolute). */
const placeSpan = (axis: Axis, startMs: number, endMs: number) => {
  const left = axisPercent(axis.segments, startMs - axis.originMs);
  return { left, width: Math.max(0, axisPercent(axis.segments, endMs - axis.originMs) - left) };
};

/** The track a row draws on: the time axis of the page, with its load milestones. */
function Track({ axis, children }: { axis: Axis; children?: ReactNode }) {
  const { euiTheme } = useEuiTheme();
  return (
    <div css={css({ position: 'relative', height: euiTheme.size.m })} aria-hidden={true}>
      {axis.segments
        .filter(({ compressed }) => compressed)
        .map(({ startPercent, endPercent }) => (
          <span
            key={startPercent}
            css={css({
              position: 'absolute',
              top: 0,
              bottom: 0,
              background: `repeating-linear-gradient(-45deg, ${euiTheme.colors.backgroundBaseSubdued} 0 2px, transparent 2px 5px)`,
            })}
            style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}
          />
        ))}
      {axis.milestones.map(({ id, offsetMs }) => (
        <span
          key={id}
          css={css({
            position: 'absolute',
            top: `-${euiTheme.size.xs}`,
            bottom: `-${euiTheme.size.xs}`,
            borderLeft: `1px dashed ${euiTheme.border.color}`,
          })}
          style={{ left: `${axisPercent(axis.segments, offsetMs)}%` }}
        />
      ))}
      {children}
    </div>
  );
}

/** A request as a bar: hatched when the browser withheld its phases, a tick when it was cached. */
function RequestBar({ request, axis }: { request: SessionRequest; axis: Axis }) {
  const { euiTheme } = useEuiTheme();
  const color = request.failed ? euiTheme.colors.danger : FAMILY_COLORS[requestFamilyOf(request)];
  const startMs = Date.parse(request.startTime);
  const { left, width } = placeSpan(axis, startMs, startMs + request.durationMs);
  const restricted = request.timingWithheld;
  return (
    <span
      data-test-subj="digitalExperienceRequestBar"
      css={css({
        position: 'absolute',
        top: 2,
        bottom: 2,
        minWidth: 2,
        borderRadius: euiTheme.border.radius.small,
      })}
      style={{
        left: `${left}%`,
        width: request.cached ? 2 : `${Math.min(width, 100 - left)}%`,
        background: restricted
          ? `repeating-linear-gradient(45deg, ${color} 0 3px, transparent 3px 6px)`
          : color,
        border: restricted ? `1px dashed ${color}` : undefined,
      }}
    />
  );
}

const durationText = (request: SessionRequest): string => {
  if (request.cached) {
    return CACHED_LABEL;
  }
  const duration = formatElapsed(request.durationMs);
  return request.failed ? `${request.statusCode ?? FAILED_LABEL} · ${duration}` : duration;
};

function TypeBadge({ request }: { request: SessionRequest }) {
  const family = requestFamilyOf(request);
  return (
    <EuiBadge color={FAMILY_COLORS[family]} css={css({ flexShrink: 0 })}>
      {FAMILY_LABELS[family]}
    </EuiBadge>
  );
}

/** A row, as a button when it has details to expand. */
function Row({
  offsetMs,
  label,
  track,
  value,
  valueColor,
  tone,
  expanded,
  onToggle,
  children,
  'data-test-subj': dataTestSubj,
}: {
  offsetMs: number;
  label: ReactNode;
  track: ReactNode;
  value?: ReactNode;
  valueColor?: 'danger' | 'subdued';
  tone?: 'click' | 'error';
  expanded?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
  'data-test-subj': string;
}) {
  const { euiTheme } = useEuiTheme();
  const background =
    tone === 'error'
      ? euiTheme.colors.backgroundBaseDanger
      : tone === 'click'
      ? euiTheme.colors.backgroundBasePrimary
      : undefined;
  const rowCss = [
    GRID_COLUMNS(euiTheme.size.s),
    css({
      width: '100%',
      padding: `${euiTheme.size.xxs} ${euiTheme.size.xs}`,
      border: 'none',
      borderRadius: euiTheme.border.radius.small,
      background: background ?? 'transparent',
      textAlign: 'left',
      color: 'inherit',
      font: 'inherit',
    }),
    onToggle &&
      css({
        cursor: 'pointer',
        '&:hover, &:focus-visible': { background: euiTheme.colors.backgroundBaseSubdued },
      }),
  ];
  const content = (
    <>
      <EuiText
        size="xs"
        color="subdued"
        css={css({ textAlign: 'right', fontVariantNumeric: 'tabular-nums' })}
      >
        {formatElapsed(offsetMs)}
      </EuiText>
      <div
        css={css({
          display: 'flex',
          alignItems: 'center',
          gap: euiTheme.size.xs,
          minWidth: 0,
        })}
      >
        {onToggle && (
          <EuiIcon
            type={expanded ? 'chevronSingleDown' : 'chevronSingleRight'}
            size="s"
            aria-hidden={true}
          />
        )}
        {label}
      </div>
      {track}
      <EuiText
        size="xs"
        color={valueColor ?? 'subdued'}
        css={css({ textAlign: 'right', fontVariantNumeric: 'tabular-nums' })}
      >
        {value}
      </EuiText>
    </>
  );
  return (
    <div data-test-subj={dataTestSubj}>
      {onToggle ? (
        <button
          type="button"
          css={rowCss}
          aria-expanded={expanded}
          onClick={onToggle}
          {...getEbtProps({
            action: DIGITAL_EXPERIENCE_EBT_ACTIONS.EXPAND_ACTIVITY,
            element: SESSIONS_EBT_ELEMENTS.ACTIVITY_ROW,
          })}
        >
          {content}
        </button>
      ) : (
        <div css={rowCss}>{content}</div>
      )}
      {expanded && children && (
        <div css={css({ margin: `${euiTheme.size.xxs} 0 ${euiTheme.size.s} 64px` })}>
          {children}
        </div>
      )}
    </div>
  );
}

const Truncated = ({ children, code }: { children: ReactNode; code?: boolean }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiText
      size="xs"
      className="eui-textTruncate"
      css={css({ minWidth: 0, fontFamily: code ? euiTheme.font.familyCode : undefined })}
    >
      {children}
    </EuiText>
  );
};

function RequestRow({
  request,
  axis,
  pageOrigin,
  expanded,
  onToggle,
}: {
  request: SessionRequest;
  axis: Axis;
  pageOrigin: string | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const traceHref = useTraceHref();
  const offsetMs = Date.parse(request.startTime) - axis.originMs;
  return (
    <Row
      data-test-subj="digitalExperienceActivityRequest"
      offsetMs={offsetMs}
      label={
        <>
          <TypeBadge request={request} />
          <Truncated code>
            {[request.method, displayUrl(request.url, pageOrigin)].filter(Boolean).join(' ')}
          </Truncated>
          {request.renderBlocking && (
            <EuiText size="xs" color="warning" css={css({ flexShrink: 0 })}>
              {RENDER_BLOCKING_LABEL}
            </EuiText>
          )}
        </>
      }
      track={
        <Track axis={axis}>
          <RequestBar request={request} axis={axis} />
        </Track>
      }
      value={durationText(request)}
      valueColor={request.failed ? 'danger' : undefined}
      expanded={expanded}
      onToggle={onToggle}
    >
      <RequestDetails
        request={request}
        offsetMs={offsetMs}
        typeLabel={FAMILY_LABELS[requestFamilyOf(request)]}
        traceHref={traceHref(request.traceId)}
      />
    </Row>
  );
}

function RepeatedRequestsRow({
  row,
  axis,
  pageOrigin,
  expanded,
  onToggle,
}: {
  row: Extract<ActivityRow, { type: 'repeated_requests' }>;
  axis: Axis;
  pageOrigin: string | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const [first] = row.requests;
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const failed = row.requests.filter((request) => request.failed).length;
  const average =
    row.requests.reduce((sum, { durationMs }) => sum + durationMs, 0) / row.requests.length;
  const color = FAMILY_COLORS[requestFamilyOf(first)];
  return (
    <Row
      data-test-subj="digitalExperienceActivityRepeatedRequests"
      offsetMs={row.startMs - axis.originMs}
      label={
        <>
          <TypeBadge request={first} />
          <Truncated code>
            {[first.method, displayUrl(urlWithoutQuery(first.url), pageOrigin)]
              .filter(Boolean)
              .join(' ')}
          </Truncated>
          <EuiBadge color="hollow" css={css({ flexShrink: 0 })}>
            {i18n.translate('xpack.digitalExperience.sessionDetail.activity.repeatedCount', {
              defaultMessage: '×{count}',
              values: { count: row.requests.length },
            })}
          </EuiBadge>
          {failed > 0 && (
            <EuiBadge color="danger" css={css({ flexShrink: 0 })}>
              {i18n.translate('xpack.digitalExperience.sessionDetail.activity.repeatedFailed', {
                defaultMessage: '{count} failed',
                values: { count: failed },
              })}
            </EuiBadge>
          )}
        </>
      }
      track={
        <Track axis={axis}>
          {/* The whole run, faint, with each request on it: the rhythm without a solid bar. */}
          <span
            css={css({
              position: 'absolute',
              top: 2,
              bottom: 2,
              opacity: 0.25,
              borderRadius: euiTheme.border.radius.small,
            })}
            style={{
              left: `${placeSpan(axis, row.startMs, row.endMs).left}%`,
              width: `${placeSpan(axis, row.startMs, row.endMs).width}%`,
              background: color,
            }}
          />
          {row.requests.map((request, index) => (
            <RequestBar key={index} request={request} axis={axis} />
          ))}
        </Track>
      }
      value={i18n.translate('xpack.digitalExperience.sessionDetail.activity.repeatedAverage', {
        defaultMessage: 'avg {duration}',
        values: { duration: formatElapsed(average) },
      })}
      expanded={expanded}
      onToggle={onToggle}
    >
      {row.requests.map((request, index) => (
        <RequestRow
          key={index}
          request={request}
          axis={axis}
          pageOrigin={pageOrigin}
          expanded={openIndex === index}
          onToggle={() => setOpenIndex(openIndex === index ? null : index)}
        />
      ))}
    </Row>
  );
}

function EventRow({
  event,
  axis,
  expanded,
  onToggle,
}: {
  event: SessionTimelineEvent;
  axis: Axis;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const isError = event.kind === 'error';
  const webVital = webVitalOf(event);
  const offsetMs = Date.parse(event.timestamp) - axis.originMs;
  const markerColor = isError ? euiTheme.colors.danger : euiTheme.colors.primary;
  const kindLabel = EVENT_LABELS[event.kind];
  return (
    <Row
      data-test-subj={`digitalExperienceSessionEvent-${event.kind}`}
      offsetMs={offsetMs}
      tone={isError ? 'error' : event.kind === 'click' ? 'click' : undefined}
      label={
        <>
          <EuiIcon
            type={EVENT_ICONS[event.kind] ?? 'dot'}
            color={isError ? 'danger' : 'subdued'}
            aria-hidden={true}
          />
          {webVital ? (
            <WebVitalBadge vital={webVital.vital} value={webVital.value} />
          ) : (
            <>
              <EuiText
                size="xs"
                color={isError ? 'danger' : undefined}
                css={css({ flexShrink: 0, fontWeight: euiTheme.font.weight.semiBold })}
              >
                {kindLabel ?? event.name}
              </EuiText>
              {event.detail && (
                <Truncated code={!isError}>
                  <span style={isError ? { color: euiTheme.colors.textDanger } : undefined}>
                    {event.detail}
                  </span>
                </Truncated>
              )}
            </>
          )}
        </>
      }
      track={
        <Track axis={axis}>
          <span
            css={css({
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 2,
              background: markerColor,
            })}
            style={{ left: `${axisPercent(axis.segments, offsetMs)}%` }}
          />
        </Track>
      }
      expanded={expanded}
      onToggle={isError ? onToggle : undefined}
    >
      {isError && <ErrorDetails stacktrace={event.stacktrace} />}
    </Row>
  );
}

/**
 * What happened on a page, in time order on one axis: its requests as a waterfall, with the clicks,
 * errors and web vitals between them, and the page load milestones as dashed lines.
 */
export function VisitActivity({
  activity,
  pageUrl,
}: {
  activity: Activity;
  pageUrl: string | null;
}) {
  const { euiTheme } = useEuiTheme();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const axis: Axis = activity;
  const hiddenRows = showAll ? 0 : Math.max(0, activity.rows.length - ACTIVITY_ROW_LIMIT);
  const rows = hiddenRows > 0 ? activity.rows.slice(0, ACTIVITY_ROW_LIMIT) : activity.rows;
  const pageOrigin = originOf(pageUrl);
  const toggle = (key: string) => () => setExpandedKey(expandedKey === key ? null : key);

  if (activity.rows.length === 0) {
    return (
      <EuiText size="xs" color="subdued" data-test-subj="digitalExperienceActivityEmpty">
        {NO_ACTIVITY}
      </EuiText>
    );
  }

  return (
    <div data-test-subj="digitalExperienceVisitActivity">
      {activity.milestones.length > 0 && (
        <div css={[GRID_COLUMNS(euiTheme.size.s), css({ padding: `0 ${euiTheme.size.xs}` })]}>
          <span />
          <span />
          <div css={css({ position: 'relative', height: euiTheme.size.xl })}>
            {activity.milestones.map(({ id, label, shortLabel, offsetMs }, index) => (
              <EuiText
                key={id}
                size="xs"
                color="subdued"
                data-test-subj={`digitalExperienceMilestone-${id}`}
                css={css({
                  position: 'absolute',
                  whiteSpace: 'nowrap',
                  transform: 'translateX(-50%)',
                })}
                // Every other label a line lower, so that close milestones don't overlap.
                style={{
                  left: `${axisPercent(activity.segments, offsetMs)}%`,
                  top: index % 2 === 0 ? 0 : euiTheme.size.base,
                }}
                aria-label={`${label} ${formatElapsed(offsetMs)}`}
              >
                {`${shortLabel} ${formatElapsed(offsetMs)}`}
              </EuiText>
            ))}
          </div>
          <span />
        </div>
      )}
      {rows.map((row) => {
        if (row.type === 'request') {
          return (
            <RequestRow
              key={row.key}
              request={row.request}
              axis={axis}
              pageOrigin={pageOrigin}
              expanded={expandedKey === row.key}
              onToggle={toggle(row.key)}
            />
          );
        }
        if (row.type === 'repeated_requests') {
          return (
            <RepeatedRequestsRow
              key={row.key}
              row={row}
              axis={axis}
              pageOrigin={pageOrigin}
              expanded={expandedKey === row.key}
              onToggle={toggle(row.key)}
            />
          );
        }
        return (
          <EventRow
            key={row.key}
            event={row.event}
            axis={axis}
            expanded={expandedKey === row.key}
            onToggle={toggle(row.key)}
          />
        );
      })}
      {activity.rows.length > ACTIVITY_ROW_LIMIT && (
        <EuiButtonEmpty
          size="xs"
          flush="left"
          iconType={showAll ? 'chevronSingleUp' : 'chevronSingleDown'}
          onClick={() => setShowAll(!showAll)}
          data-test-subj="digitalExperienceActivityShowAll"
          {...getEbtProps({
            action: DIGITAL_EXPERIENCE_EBT_ACTIONS.EXPAND_ACTIVITY,
            element: SESSIONS_EBT_ELEMENTS.ACTIVITY_SHOW_ALL,
          })}
        >
          {showAll
            ? i18n.translate('xpack.digitalExperience.sessionDetail.activity.showFewer', {
                defaultMessage: 'Show the first {limit} rows',
                values: { limit: ACTIVITY_ROW_LIMIT },
              })
            : i18n.translate('xpack.digitalExperience.sessionDetail.activity.showAll', {
                defaultMessage: 'Show all {count} rows ({hidden} more)',
                values: { count: activity.rows.length, hidden: hiddenRows },
              })}
        </EuiButtonEmpty>
      )}
      {activity.segments.some(({ compressed }) => compressed) && (
        <EuiText
          size="xs"
          color="subdued"
          data-test-subj="digitalExperienceActivityCompressedNote"
          css={css({ marginTop: euiTheme.size.s })}
        >
          {i18n.translate('xpack.digitalExperience.sessionDetail.activity.compressedNote', {
            defaultMessage:
              'Hatched stretches had no activity for more than {seconds, plural, one {# second} other {# seconds}}, so they are shortened.',
            values: { seconds: IDLE_GAP_MS / 1_000 },
          })}
        </EuiText>
      )}
    </div>
  );
}
