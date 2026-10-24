/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  euiPaletteColorBlind,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import type { PageVisit, RumSessionDetail, SessionAction } from '../../../common/session_replay';
import { summarizeBackendCallsFromActions } from '../../../common/rum_backend';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { fetchSessionDetail } from '../../services/rest/session_replay_api';
import { UserCell, WebVitalBadges, formatDurationMs, formatTime } from './session_ui';
import { ReplayThumbnail } from './replay_thumbnail';
import { uxAppHref, mergeRumSearch, pushRumPath, sessionsPatch } from '../../utils/rum_search';
import { serviceNameFromPath, uxAppPath, uxSessionIdFromPath } from '../../utils/ux_app_path';
import { useLegacyUrlParams } from '../../context/url_params_context/use_url_params';
import { BackendCallsPanel } from '../trace/backend_calls_panel';
import { SyntheticsMonitorChip } from '../trace/synthetics_monitor_chip';
import { TraceWaterfallFlyout, type TraceFlyoutTarget } from '../trace/trace_waterfall_flyout';

const ACTION_ICON: Record<SessionAction['kind'], string> = {
  click: 'clickLeft',
  navigation: 'sortRight',
  error: 'warning',
  load: 'globe',
  http: 'symlink',
  inp: 'bolt',
  longtask: 'clock',
};

type ActionColorKey = 'primary' | 'accent' | 'danger' | 'success' | 'warning';

const ACTION_COLOR: Record<SessionAction['kind'], ActionColorKey> = {
  click: 'primary',
  navigation: 'accent',
  error: 'danger',
  load: 'success',
  http: 'primary',
  inp: 'accent',
  longtask: 'warning',
};

const formatOffset = (ms: number): string => {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const hasVitals = (v: PageVisit['webVitals']): boolean =>
  v.lcp != null || v.fcp != null || v.cls != null || v.inp != null || v.ttfb != null;

/** Stable color per unique page path, in first-appearance order. */
const usePageColors = (visits: PageVisit[]): Map<string, string> =>
  useMemo(() => {
    const palette = euiPaletteColorBlind({ rotations: 3 });
    const map = new Map<string, string>();
    let next = 0;
    for (const visit of visits) {
      if (!map.has(visit.path)) {
        map.set(visit.path, palette[next % palette.length]);
        next += 1;
      }
    }
    return map;
  }, [visits]);

/** Horizontal waterfall: one segment per page visit, width ∝ time on page. */
const SessionWaterfall = ({
  visits,
  sessionDurationMs,
  colors,
  onSelect,
}: {
  visits: PageVisit[];
  sessionDurationMs: number;
  colors: Map<string, string>;
  onSelect: (index: number) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const total = Math.max(sessionDurationMs, 1);

  const errorMarkers = visits.flatMap((visit) =>
    visit.actions
      .filter((action) => action.kind === 'error')
      .map((action) => ({
        pct: Math.min(100, (action.offsetMs / total) * 100),
        label: action.label,
        kind: 'error' as const,
      }))
  );
  const perfMarkers = visits.flatMap((visit) =>
    visit.actions
      .filter((action) => action.kind === 'inp' || action.kind === 'longtask')
      .map((action) => ({
        pct: Math.min(100, (action.offsetMs / total) * 100),
        label: action.label,
        kind: action.kind,
      }))
  );

  return (
    <div>
      <div
        css={css`
          position: relative;
          display: flex;
          width: 100%;
          height: 30px;
          border-radius: ${euiTheme.border.radius.medium};
          overflow: hidden;
          background: ${euiTheme.colors.lightestShade};
        `}
      >
        {visits.map((visit) => {
          const color = colors.get(visit.path) ?? euiTheme.colors.primary;
          return (
            <EuiToolTip
              key={visit.index}
              position="top"
              display="block"
              anchorProps={{
                style: { flexGrow: Math.max(visit.durationMs, 1), flexBasis: 0, minWidth: '3px' },
              }}
              content={`${visit.path} · ${formatDurationMs(visit.durationMs)} · ${
                visit.actionCount
              } actions${visit.errorCount ? ` · ${visit.errorCount} errors` : ''}`}
            >
              <button
                type="button"
                onClick={() => onSelect(visit.index)}
                aria-label={visit.path}
                css={css`
                  display: block;
                  height: 30px;
                  width: 100%;
                  border: none;
                  border-right: 1px solid ${euiTheme.colors.emptyShade};
                  background: ${color};
                  cursor: pointer;
                  transition: filter 0.1s ease;
                  &:hover {
                    filter: brightness(1.12);
                  }
                `}
              />
            </EuiToolTip>
          );
        })}
        {errorMarkers.map((marker, index) => (
          <span
            key={`err-${index}`}
            title={marker.label}
            css={css`
              position: absolute;
              top: 0;
              bottom: 0;
              width: 2px;
              background: ${euiTheme.colors.danger};
              box-shadow: 0 0 0 1px ${euiTheme.colors.emptyShade};
            `}
            style={{ left: `${marker.pct}%` }}
          />
        ))}
        {perfMarkers.map((marker, index) => (
          <span
            key={`perf-${index}`}
            title={marker.label}
            css={css`
              position: absolute;
              top: 4px;
              bottom: 4px;
              width: 2px;
              background: ${marker.kind === 'inp'
                ? euiTheme.colors.accent
                : euiTheme.colors.warning};
              box-shadow: 0 0 0 1px ${euiTheme.colors.emptyShade};
            `}
            style={{ left: `${marker.pct}%` }}
          />
        ))}
      </div>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" wrap responsive={false}>
        {visits.map((visit) => (
          <EuiFlexItem grow={false} key={visit.index}>
            <button
              type="button"
              onClick={() => onSelect(visit.index)}
              css={css`
                display: inline-flex;
                align-items: center;
                gap: 6px;
                border: none;
                background: transparent;
                cursor: pointer;
                padding: 0;
              `}
            >
              <span
                css={css`
                  width: 10px;
                  height: 10px;
                  border-radius: 2px;
                `}
                style={{ background: colors.get(visit.path) }}
              />
              <EuiText size="xs" color="subdued">
                {visit.path}
              </EuiText>
            </button>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
};

const ActionRow = ({
  action,
  onViewTrace,
  onOpenError,
  onSeek,
}: {
  action: SessionAction;
  onViewTrace?: (target: TraceFlyoutTarget) => void;
  onOpenError?: (errorGroup: string) => void;
  onSeek?: (offsetMs: number) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const colorKey = ACTION_COLOR[action.kind];
  const color = euiTheme.colors[colorKey];
  const seekable = Boolean(onSeek);
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      onClick={seekable ? () => onSeek?.(action.offsetMs) : undefined}
      css={
        seekable
          ? css`
              cursor: pointer;
              border-radius: ${euiTheme.border.radius.medium};
              padding: 2px 4px;
              margin: 0 -4px;
              &:hover {
                background: ${euiTheme.colors.lightestShade};
              }
            `
          : undefined
      }
      aria-label={
        seekable
          ? i18n.translate('xpack.ux.sessionDetail.seekActionAria', {
              defaultMessage: 'Play replay at {time}',
              values: { time: formatOffset(action.offsetMs) },
            })
          : undefined
      }
    >
      <EuiFlexItem grow={false}>
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            font-variant-numeric: tabular-nums;
            width: 40px;
            text-align: right;
          `}
        >
          {formatOffset(action.offsetMs)}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <span
          css={css`
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            border-radius: 6px;
            background: ${transparentize(color, 0.15)};
          `}
        >
          <EuiIcon type={ACTION_ICON[action.kind]} size="s" color={color} aria-hidden={true} />
        </span>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText
          size="s"
          css={css`
            font-weight: ${action.kind === 'error' ? 600 : 400};
          `}
        >
          {action.label}
        </EuiText>
      </EuiFlexItem>
      {action.detail && action.kind === 'http' && action.graphqlOperation && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{action.graphqlOperation}</EuiBadge>
        </EuiFlexItem>
      )}
      {action.detail && action.kind === 'error' && (
        <EuiFlexItem
          grow
          css={css`
            min-width: 0;
          `}
        >
          <EuiText size="xs" color="danger" className="eui-textTruncate" title={action.detail}>
            {action.detail}
          </EuiText>
        </EuiFlexItem>
      )}
      {action.kind === 'error' && action.errorGroup && onOpenError && (
        <EuiFlexItem grow={false}>
          <EuiLink
            data-test-subj="uxActionRowErrorGroupLink"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              if (action.errorGroup) {
                onOpenError(action.errorGroup);
              }
            }}
          >
            {i18n.translate('xpack.ux.sessionDetail.errorGroupLink', {
              defaultMessage: 'Error group',
            })}
          </EuiLink>
        </EuiFlexItem>
      )}
      {action.traceId && onViewTrace && (
        <EuiFlexItem grow={false}>
          <EuiLink
            data-test-subj="uxActionRowViewTraceLink"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              if (action.traceId) {
                onViewTrace({
                  traceId: action.traceId,
                  spanId: action.spanId,
                  timestamp: action.timestamp,
                  title: action.label,
                });
              }
            }}
          >
            {i18n.translate('xpack.ux.sessionDetail.viewTrace', {
              defaultMessage: 'View trace',
            })}
          </EuiLink>
        </EuiFlexItem>
      )}
      {seekable && (
        <EuiFlexItem grow={false}>
          <EuiIcon type="play" size="s" color="subdued" aria-hidden={true} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const PageVisitNode = ({
  visit,
  sessionDurationMs,
  color,
  isLast,
  registerRef,
  onViewTrace,
  onOpenError,
  onSeek,
}: {
  visit: PageVisit;
  sessionDurationMs: number;
  color: string;
  isLast: boolean;
  registerRef: (index: number, node: HTMLDivElement | null) => void;
  onViewTrace: (target: TraceFlyoutTarget) => void;
  onOpenError: (errorGroup: string) => void;
  onSeek?: (offsetMs: number) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const pctOfSession =
    sessionDurationMs > 0 ? Math.round((visit.durationMs / sessionDurationMs) * 100) : 0;

  return (
    <div
      ref={(node) => registerRef(visit.index, node)}
      css={css`
        display: flex;
        gap: ${euiTheme.size.m};
        scroll-margin-top: 16px;
      `}
    >
      {/* Rail column: numbered node + connecting line */}
      <div
        css={css`
          position: relative;
          flex: 0 0 32px;
          display: flex;
          justify-content: center;
        `}
      >
        {!isLast && (
          <span
            css={css`
              position: absolute;
              top: 28px;
              bottom: -${euiTheme.size.l};
              width: 2px;
              background: ${euiTheme.colors.lightShade};
            `}
          />
        )}
        <span
          css={css`
            position: relative;
            z-index: 1;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: ${euiTheme.colors.emptyShade};
            font-weight: 700;
            font-size: 12px;
          `}
          style={{ background: color }}
        >
          {visit.index + 1}
        </span>
      </div>

      {/* Content */}
      <EuiPanel
        hasBorder
        paddingSize="m"
        css={css`
          flex: 1 1 auto;
          margin-bottom: ${euiTheme.size.l};
          border-left: 3px solid ${color};
        `}
        data-test-subj="uxSessionPageVisitCard"
      >
        <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h3
                css={css`
                  font-family: ${euiTheme.font.familyCode};
                `}
              >
                {visit.path}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {formatTime(visit.startTime)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        {/* Duration bar */}
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText
              size="s"
              css={css`
                font-weight: 600;
                width: 56px;
              `}
            >
              {formatDurationMs(visit.durationMs)}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <div
              css={css`
                height: 8px;
                border-radius: 999px;
                background: ${euiTheme.colors.lightestShade};
                overflow: hidden;
              `}
            >
              <div
                css={css`
                  height: 100%;
                  border-radius: 999px;
                `}
                style={{ width: `${Math.max(2, pctOfSession)}%`, background: color }}
              />
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {pctOfSession}%
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        <EuiFlexGroup gutterSize="s" responsive={false} wrap alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" iconType="clickLeft">
              {i18n.translate('xpack.ux.sessionDetail.actionsCount', {
                defaultMessage: '{count} actions',
                values: { count: visit.actionCount },
              })}
            </EuiBadge>
          </EuiFlexItem>
          {visit.errorCount > 0 && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="danger" iconType="warning">
                {i18n.translate('xpack.ux.sessionDetail.errorsCount', {
                  defaultMessage: '{count} errors',
                  values: { count: visit.errorCount },
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
          {hasVitals(visit.webVitals) && (
            <EuiFlexItem grow={false}>
              <WebVitalBadges vitals={visit.webVitals} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {visit.actions.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <div
              css={css`
                display: flex;
                flex-direction: column;
                gap: 6px;
                max-height: 240px;
                overflow-y: auto;
              `}
            >
              {visit.actions.map((action, index) => (
                <ActionRow
                  key={index}
                  action={action}
                  onViewTrace={onViewTrace}
                  onOpenError={onOpenError}
                  onSeek={onSeek}
                />
              ))}
            </div>
          </>
        )}
      </EuiPanel>
    </div>
  );
};

const SummaryStat = ({
  icon,
  iconColor,
  value,
  label,
  valueColor,
}: {
  icon: string;
  iconColor: string;
  value: string;
  label: string;
  valueColor?: string;
}) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <span
          css={css`
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background: ${transparentize(iconColor, 0.15)};
          `}
        >
          <EuiIcon type={icon} color={iconColor} aria-hidden={true} />
        </span>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText
          size="m"
          css={css`
            font-weight: 700;
            line-height: 1.1;
          `}
          style={valueColor ? { color: valueColor } : undefined}
        >
          {value}
        </EuiText>
        <EuiText size="xs" color="subdued">
          {label}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export function SessionDetailPage() {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const sessionId = uxSessionIdFromPath(history.location.pathname) ?? '';
  const serviceName = serviceNameFromPath(history.location.pathname);
  const { http, observabilityShared } = useKibanaServices();
  const PageTemplateComponent = observabilityShared.navigation.PageTemplate;
  const {
    urlParams: { rangeFrom = 'now-24h', rangeTo = 'now' },
  } = useLegacyUrlParams();

  const [detail, setDetail] = useState<RumSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [traceTarget, setTraceTarget] = useState<TraceFlyoutTarget | null>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const registerRef = useCallback((index: number, node: HTMLDivElement | null) => {
    if (node) {
      cardRefs.current.set(index, node);
    } else {
      cardRefs.current.delete(index);
    }
  }, []);

  const scrollToVisit = useCallback((index: number) => {
    cardRefs.current.get(index)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.ux.sessionDetail.breadcrumbs.root', {
        defaultMessage: 'User Experience',
      }),
      href: uxAppHref(http.basePath.prepend, { search: history.location.search }),
    },
    {
      text: i18n.translate('xpack.ux.sessionDetail.breadcrumbs.list', {
        defaultMessage: 'Sessions',
      }),
      href: uxAppHref(http.basePath.prepend, {
        serviceName,
        suffix: '/session-replay',
        search: history.location.search,
      }),
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        pushRumPath(history, '/session-replay');
      },
    },
    { text: sessionId ? sessionId.slice(0, 8) : '—' },
  ]);

  const loadDetail = useCallback(async () => {
    if (!sessionId) {
      setError(
        i18n.translate('xpack.ux.sessionDetail.missingId', {
          defaultMessage: 'Missing session id in the URL.',
        })
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSessionDetail({ http, sessionId });
      setDetail(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [http, sessionId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const openPlayer = useCallback(
    (offsetMs?: number) => {
      const search =
        offsetMs != null
          ? mergeRumSearch(history.location.search, {
              t: String(Math.max(0, Math.round(offsetMs))),
            })
          : history.location.search;
      history.push({
        pathname: uxAppPath(serviceName, `/session-replay/${encodeURIComponent(sessionId)}/replay`),
        search,
      });
    },
    [history, serviceName, sessionId]
  );

  const pageColors = usePageColors(detail?.pageVisits ?? []);

  const backendCalls = useMemo(
    () =>
      summarizeBackendCallsFromActions(
        (detail?.pageVisits ?? []).flatMap((visit) => visit.actions)
      ),
    [detail]
  );

  const onOpenError = useCallback(
    (errorGroup: string) => {
      pushRumPath(history, '/session-replay', sessionsPatch({ errorGroup }));
    },
    [history]
  );

  return (
    <div data-test-subj="uxSessionDetailPage">
      <PageTemplateComponent
        paddingSize="m"
        pageHeader={{
          pageTitle: i18n.translate('xpack.ux.sessionDetail.title', {
            defaultMessage: 'Session details',
          }),
          rightSideItems: [
            <EuiButtonEmpty
              key="back"
              iconType="chevronSingleLeft"
              data-test-subj="uxSessionDetailBack"
              onClick={() => pushRumPath(history, '/session-replay')}
            >
              {i18n.translate('xpack.ux.sessionDetail.back', {
                defaultMessage: 'Back to sessions',
              })}
            </EuiButtonEmpty>,
          ],
        }}
      >
        {loading && (
          <EuiPanel hasShadow={false} hasBorder={false}>
            <EuiFlexGroup
              justifyContent="center"
              alignItems="center"
              css={css`
                min-height: 240px;
              `}
            >
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="xl" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        )}

        {error && !loading && (
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="error"
            title={i18n.translate('xpack.ux.sessionDetail.errorTitle', {
              defaultMessage: 'Unable to load session',
            })}
          >
            <p>{error}</p>
            <EuiButton color="danger" onClick={loadDetail} data-test-subj="uxSessionDetailRetry">
              {i18n.translate('xpack.ux.sessionDetail.retry', { defaultMessage: 'Retry' })}
            </EuiButton>
          </EuiCallOut>
        )}

        {detail && !loading && !error && (
          <>
            <EuiPanel hasBorder paddingSize="l">
              <EuiFlexGroup gutterSize="l" alignItems="flexStart" wrap>
                {detail.hasReplay && (
                  <EuiFlexItem grow={false} css={{ width: 380, maxWidth: '100%' }}>
                    <ReplayThumbnail sessionId={sessionId} onOpen={() => openPlayer()} />
                  </EuiFlexItem>
                )}
                <EuiFlexItem>
                  <EuiFlexGroup
                    gutterSize="m"
                    alignItems="center"
                    justifyContent="spaceBetween"
                    wrap
                    responsive={false}
                  >
                    <EuiFlexItem grow>
                      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap>
                        <EuiFlexItem grow={false}>
                          <UserCell user={detail.user} client={detail.client} />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiText
                            size="xs"
                            color="subdued"
                            css={css`
                              font-family: ${euiTheme.font.familyCode};
                            `}
                          >
                            {sessionId}
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    {detail.hasReplay && (
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          fill
                          iconType="play"
                          data-test-subj="uxSessionDetailPlay"
                          onClick={() => openPlayer()}
                        >
                          {i18n.translate('xpack.ux.sessionDetail.play', {
                            defaultMessage: 'Play replay',
                          })}
                        </EuiButton>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                  {detail.pageVisits[0]?.path && (
                    <>
                      <EuiSpacer size="m" />
                      <SyntheticsMonitorChip
                        pagePath={detail.pageVisits[0].path}
                        showCreateCheck={false}
                      />
                    </>
                  )}
                  <EuiSpacer size="l" />
                  <EuiFlexGroup gutterSize="xl" wrap responsive={false}>
                    <EuiFlexItem grow={false}>
                      <SummaryStat
                        icon="clock"
                        iconColor={euiTheme.colors.primary}
                        value={formatDurationMs(detail.durationMs)}
                        label={i18n.translate('xpack.ux.sessionDetail.stat.duration', {
                          defaultMessage: 'Duration',
                        })}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <SummaryStat
                        icon="document"
                        iconColor={euiTheme.colors.accent}
                        value={String(detail.pageCount)}
                        label={i18n.translate('xpack.ux.sessionDetail.stat.pages', {
                          defaultMessage: 'Pages visited',
                        })}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <SummaryStat
                        icon="clickLeft"
                        iconColor={euiTheme.colors.success}
                        value={String(detail.actionCount)}
                        label={i18n.translate('xpack.ux.sessionDetail.stat.actions', {
                          defaultMessage: 'Actions',
                        })}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <SummaryStat
                        icon="warning"
                        iconColor={
                          detail.errorCount > 0
                            ? euiTheme.colors.danger
                            : euiTheme.colors.mediumShade
                        }
                        value={String(detail.errorCount)}
                        valueColor={detail.errorCount > 0 ? euiTheme.colors.danger : undefined}
                        label={i18n.translate('xpack.ux.sessionDetail.stat.errors', {
                          defaultMessage: 'Errors',
                        })}
                      />
                    </EuiFlexItem>
                    {detail.rageClickCount > 0 && (
                      <EuiFlexItem grow={false}>
                        <SummaryStat
                          icon="bolt"
                          iconColor={euiTheme.colors.warning}
                          value={String(detail.rageClickCount)}
                          label={i18n.translate('xpack.ux.sessionDetail.stat.rage', {
                            defaultMessage: 'Rage clicks',
                          })}
                        />
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>

                  {hasVitals(detail.webVitals) && (
                    <>
                      <EuiSpacer size="m" />
                      <EuiText size="xs" color="subdued">
                        {i18n.translate('xpack.ux.sessionDetail.coreWebVitals', {
                          defaultMessage: 'Core Web Vitals',
                        })}
                      </EuiText>
                      <EuiSpacer size="xs" />
                      <WebVitalBadges vitals={detail.webVitals} />
                    </>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>

            {detail.pageVisits.length > 1 && (
              <>
                <EuiSpacer size="l" />
                <EuiPanel hasBorder paddingSize="m">
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.ux.sessionDetail.timeline', {
                      defaultMessage: 'Session timeline',
                    })}
                  </EuiText>
                  <EuiSpacer size="s" />
                  <SessionWaterfall
                    visits={detail.pageVisits}
                    sessionDurationMs={detail.durationMs}
                    colors={pageColors}
                    onSelect={scrollToVisit}
                  />
                </EuiPanel>
              </>
            )}

            {backendCalls.length > 0 && (
              <>
                <EuiSpacer size="l" />
                <EuiPanel hasBorder paddingSize="m">
                  <BackendCallsPanel
                    calls={backendCalls}
                    rangeFrom={rangeFrom}
                    rangeTo={rangeTo}
                    onViewTrace={setTraceTarget}
                  />
                </EuiPanel>
              </>
            )}

            <EuiSpacer size="l" />

            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.ux.sessionDetail.pageJourney', {
                  defaultMessage: 'Page journey',
                })}
              </h2>
            </EuiTitle>
            <EuiSpacer size="m" />

            {detail.pageVisits.length === 0 ? (
              <EuiCallOut
                announceOnMount
                color="primary"
                iconType="info"
                title={i18n.translate('xpack.ux.sessionDetail.noPages', {
                  defaultMessage: 'No page views recorded for this session',
                })}
              />
            ) : (
              <div>
                {detail.pageVisits.map((visit, index) => (
                  <PageVisitNode
                    key={visit.index}
                    visit={visit}
                    sessionDurationMs={detail.durationMs}
                    color={pageColors.get(visit.path) ?? euiTheme.colors.primary}
                    isLast={index === detail.pageVisits.length - 1}
                    registerRef={registerRef}
                    onViewTrace={setTraceTarget}
                    onOpenError={onOpenError}
                    onSeek={detail.hasReplay ? openPlayer : undefined}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </PageTemplateComponent>
      {traceTarget && (
        <TraceWaterfallFlyout
          target={traceTarget}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          onClose={() => setTraceTarget(null)}
        />
      )}
    </div>
  );
}
