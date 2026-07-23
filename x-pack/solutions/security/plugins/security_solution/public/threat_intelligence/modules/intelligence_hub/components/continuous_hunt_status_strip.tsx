/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiPanel,
  EuiProgress,
  EuiSkeletonText,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import {
  CONTINUOUS_HUNT_STATUS_API_PATH,
  type ContinuousHuntStatusResponse,
} from '../../../../../common/threat_intelligence/hub';
import { useKibana } from '../../../../common/lib/kibana';

type ContinuousHuntDisplayState = 'new_findings' | 'quiet' | 'hunting';

const POLL_MS_HUNTING = 2_000;
const POLL_MS_IDLE = 10_000;
const EMPTY_SPARKLINE = Array.from({ length: 24 }, () => 0);

const pulseKeyframes = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
`;

const pulseStyle = css`
  animation: ${pulseKeyframes} 1.6s ease-in-out infinite;
`;

/** Shared row heights so heading / meta lines align across columns. */
const HEADING_ROW_HEIGHT = 24;
const META_ROW_HEIGHT = 24;
const ROW_GAP = 8;
const STRIP_CONTENT_HEIGHT = HEADING_ROW_HEIGHT + ROW_GAP + META_ROW_HEIGHT;
const SPARKLINE_BAR_HEIGHT = 20;

const metaDot = ' · ';

const columnGridCss = css({
  display: 'grid',
  gridTemplateRows: `${HEADING_ROW_HEIGHT}px ${META_ROW_HEIGHT}px`,
  rowGap: ROW_GAP,
  alignItems: 'center',
  minHeight: STRIP_CONTENT_HEIGHT,
});

const formatRelativeAgo = (iso: string | undefined, nowMs: number): string | undefined => {
  if (!iso) {
    return undefined;
  }
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) {
    return undefined;
  }
  const deltaSec = Math.max(0, Math.round((nowMs - then) / 1000));
  if (deltaSec < 60) {
    return i18n.translate(
      'xpack.securitySolution.threatIntelligence.app.continuousHuntRelativeSecondsAgo',
      {
        defaultMessage: '{seconds}s ago',
        values: { seconds: deltaSec },
      }
    );
  }
  const deltaMin = Math.round(deltaSec / 60);
  if (deltaMin < 60) {
    return i18n.translate(
      'xpack.securitySolution.threatIntelligence.app.continuousHuntRelativeMinutesAgo',
      {
        defaultMessage: '{minutes} min ago',
        values: { minutes: deltaMin },
      }
    );
  }
  const deltaHours = Math.round(deltaMin / 60);
  if (deltaHours < 48) {
    return i18n.translate(
      'xpack.securitySolution.threatIntelligence.app.continuousHuntRelativeHoursAgo',
      {
        defaultMessage: '{hours}h ago',
        values: { hours: deltaHours },
      }
    );
  }
  const deltaDays = Math.round(deltaHours / 24);
  return i18n.translate(
    'xpack.securitySolution.threatIntelligence.app.continuousHuntRelativeDaysAgo',
    {
      defaultMessage: '{days}d ago',
      values: { days: deltaDays },
    }
  );
};

const formatRelativeIn = (iso: string | undefined, nowMs: number): string | undefined => {
  if (!iso) {
    return undefined;
  }
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) {
    return undefined;
  }
  const deltaSec = Math.max(0, Math.round((then - nowMs) / 1000));
  if (deltaSec < 60) {
    return i18n.translate(
      'xpack.securitySolution.threatIntelligence.app.continuousHuntRelativeInSeconds',
      {
        defaultMessage: 'in {seconds}s',
        values: { seconds: deltaSec },
      }
    );
  }
  const deltaMin = Math.round(deltaSec / 60);
  if (deltaMin < 60) {
    return i18n.translate(
      'xpack.securitySolution.threatIntelligence.app.continuousHuntRelativeInMinutes',
      {
        defaultMessage: 'in {minutes} min',
        values: { minutes: deltaMin },
      }
    );
  }
  const deltaHours = Math.round(deltaMin / 60);
  if (deltaHours < 48) {
    return i18n.translate(
      'xpack.securitySolution.threatIntelligence.app.continuousHuntRelativeInHours',
      {
        defaultMessage: 'in {hours}h',
        values: { hours: deltaHours },
      }
    );
  }
  const deltaDays = Math.round(deltaHours / 24);
  return i18n.translate(
    'xpack.securitySolution.threatIntelligence.app.continuousHuntRelativeInDays',
    {
      defaultMessage: 'in {days}d',
      values: { days: deltaDays },
    }
  );
};

const deriveDisplayState = (status: ContinuousHuntStatusResponse): ContinuousHuntDisplayState => {
  if (status.phase === 'hunting') {
    return 'hunting';
  }
  if (status.findings.new_count > 0) {
    return 'new_findings';
  }
  return 'quiet';
};

interface BarSparklineProps {
  values: number[];
  label: string;
  testSubj: string;
  quiet?: boolean;
  badge?: React.ReactNode;
}

const BarSparklineComponent: React.FC<BarSparklineProps> = ({
  values,
  label,
  testSubj,
  quiet = false,
  badge,
}) => {
  const { euiTheme } = useEuiTheme();
  const max = Math.max(...values, 1);

  const barsCss = css({
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 2,
    height: SPARKLINE_BAR_HEIGHT,
    minWidth: 120,
  });

  const barCss = (value: number, index: number) => {
    const intensity = value / max;
    return css({
      flex: '1 1 0',
      maxWidth: 5,
      minHeight: 2,
      height: `${Math.max(6, intensity * 100)}%`,
      backgroundColor: quiet
        ? euiTheme.colors.mediumShade
        : index < values.length * 0.45
        ? euiTheme.colors.lightShade
        : euiTheme.colors.primary,
      borderRadius: 1,
      opacity: quiet ? 0.55 : 0.55 + intensity * 0.45,
    });
  };

  return (
    <div data-test-subj={testSubj} css={columnGridCss}>
      <div css={barsCss} aria-hidden="true">
        {values.map((value, index) => (
          <div key={`bar-${index}`} css={barCss(value, index)} />
        ))}
      </div>
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        justifyContent="flexEnd"
        responsive={false}
        wrap={false}
      >
        {badge ? <EuiFlexItem grow={false}>{badge}</EuiFlexItem> : null}
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {label}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

const BarSparkline = React.memo(BarSparklineComponent);

const useColumnDividerCss = () => {
  const { euiTheme } = useEuiTheme();
  return css({
    paddingLeft: euiTheme.size.l,
    paddingRight: euiTheme.size.l,
    borderLeft: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
  });
};

const ContinuousHuntLeftColumn: React.FC<{
  reportsHunted: number;
  lastRun: string;
  nextRun: string;
}> = ({ reportsHunted, lastRun, nextRun }) => {
  const { euiTheme } = useEuiTheme();

  const activeStatusLabel = i18n.translate(
    'xpack.securitySolution.threatIntelligence.app.continuousHuntActiveStatus',
    { defaultMessage: 'Continuous hunt active' }
  );

  const reportsHuntedBadge = i18n.translate(
    'xpack.securitySolution.threatIntelligence.app.continuousHuntReportsHuntedBadge',
    {
      defaultMessage: '{count, plural, one {# report hunted} other {# reports hunted}}',
      values: { count: reportsHunted },
    }
  );

  return (
    <div data-test-subj="threatIntelContinuousHuntLeftColumn" css={columnGridCss}>
      <EuiHealth color="success">
        <EuiText size="s" css={css({ color: euiTheme.colors.success, lineHeight: 1.2 })}>
          <strong>{activeStatusLabel}</strong>
        </EuiText>
      </EuiHealth>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" data-test-subj="threatIntelContinuousHuntCycleStats">
            {reportsHuntedBadge}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {lastRun}
            {metaDot}
            {nextRun}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

const ContinuousHuntStatusStripComponent: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { http } = useKibana().services;
  const columnDividerCss = useColumnDividerCss();

  const [status, setStatus] = useState<ContinuousHuntStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const statusRef = useRef<ContinuousHuntStatusResponse | null>(null);
  statusRef.current = status;
  const abortRef = useRef<AbortController | null>(null);

  const fetchStatus = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const isFirstLoad = statusRef.current === null;

    try {
      const body = await http.get<ContinuousHuntStatusResponse>(CONTINUOUS_HUNT_STATUS_API_PATH, {
        version: '2023-10-31',
        signal: controller.signal,
      });
      if (controller.signal.aborted) {
        return;
      }
      setStatus(body);
      setError(false);
      setNowMs(Date.now());
    } catch (err) {
      if (controller.signal.aborted || (err as { name?: string })?.name === 'AbortError') {
        return;
      }
      if (isFirstLoad) {
        setError(true);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [http]);

  useEffect(() => {
    void fetchStatus();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchStatus]);

  useEffect(() => {
    const phase = status?.phase ?? 'idle';
    const intervalMs = phase === 'hunting' ? POLL_MS_HUNTING : POLL_MS_IDLE;
    const id = window.setInterval(() => {
      void fetchStatus();
    }, intervalMs);
    return () => {
      window.clearInterval(id);
    };
  }, [fetchStatus, status?.phase]);

  const displayState = status ? deriveDisplayState(status) : null;

  const sparklineLabel = i18n.translate(
    'xpack.securitySolution.threatIntelligence.app.continuousHuntActivitySparklineLabel',
    { defaultMessage: 'Activity · 24h' }
  );

  const thisCycleLabel = i18n.translate(
    'xpack.securitySolution.threatIntelligence.app.continuousHuntThisCycle',
    { defaultMessage: 'This cycle' }
  );

  const stripPanelCss = css({
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
  });

  const huntingPanelCss = css({
    borderColor: euiTheme.colors.primary,
  });

  const huntingDotCss = css({
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: euiTheme.colors.primary,
    marginRight: euiTheme.size.s,
    flexShrink: 0,
  });

  const lastRunLabel = useMemo(() => {
    const ago = formatRelativeAgo(status?.last_completed_at, nowMs);
    if (!ago) {
      return i18n.translate(
        'xpack.securitySolution.threatIntelligence.app.continuousHuntLastRunUnknown',
        { defaultMessage: 'Last run unknown' }
      );
    }
    return i18n.translate(
      'xpack.securitySolution.threatIntelligence.app.continuousHuntLastRunLive',
      {
        defaultMessage: 'Last run {ago}',
        values: { ago },
      }
    );
  }, [nowMs, status?.last_completed_at]);

  const nextRunLabel = useMemo(() => {
    const inRel = formatRelativeIn(status?.next_run_at, nowMs);
    if (!inRel) {
      return i18n.translate(
        'xpack.securitySolution.threatIntelligence.app.continuousHuntNextRunUnknown',
        { defaultMessage: 'Next run unknown' }
      );
    }
    return i18n.translate(
      'xpack.securitySolution.threatIntelligence.app.continuousHuntNextRunLive',
      {
        defaultMessage: 'Next {inRel}',
        values: { inRel },
      }
    );
  }, [nowMs, status?.next_run_at]);

  if (loading && !status) {
    return (
      <EuiPanel
        hasBorder
        paddingSize="m"
        data-test-subj="threatIntelContinuousHuntStatusStrip-loading"
        css={stripPanelCss}
      >
        <div css={css({ minHeight: STRIP_CONTENT_HEIGHT })}>
          <EuiSkeletonText lines={2} />
        </div>
      </EuiPanel>
    );
  }

  if (error && !status) {
    return (
      <EuiPanel
        hasBorder
        paddingSize="m"
        data-test-subj="threatIntelContinuousHuntStatusStrip-error"
        css={stripPanelCss}
      >
        <EuiFlexGroup alignItems="center" responsive={false} gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>
                {i18n.translate(
                  'xpack.securitySolution.threatIntelligence.app.continuousHuntFallbackTitle',
                  { defaultMessage: 'Continuous hunt' }
                )}
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate(
                'xpack.securitySolution.threatIntelligence.app.continuousHuntStatusUnavailable',
                { defaultMessage: 'Status unavailable' }
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  if (!status || !displayState) {
    return null;
  }

  const sparklineValues =
    status.sparkline_24h.length === 24 ? status.sparkline_24h : EMPTY_SPARKLINE;

  const quietBadge = (
    <EuiBadge color="hollow" data-test-subj="threatIntelContinuousHuntQuietPill">
      {i18n.translate('xpack.securitySolution.threatIntelligence.app.continuousHuntQuietPill', {
        defaultMessage: 'quiet',
      })}
    </EuiBadge>
  );

  const reportTitle =
    status.report?.title ??
    status.report?.id ??
    i18n.translate(
      'xpack.securitySolution.threatIntelligence.app.continuousHuntUnknownReportTitle',
      { defaultMessage: 'threat report' }
    );

  const tierCurrent = status.tier?.current ?? 1;
  const tierTotal = status.tier?.total ?? 2;
  const tierProgressValue = Math.round((tierCurrent / tierTotal) * 100);

  const startedAgo =
    formatRelativeAgo(status.started_at, nowMs) ??
    i18n.translate('xpack.securitySolution.threatIntelligence.app.continuousHuntStartedUnknown', {
      defaultMessage: 'just now',
    });

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      data-test-subj="threatIntelContinuousHuntStatusStrip"
      css={[
        stripPanelCss,
        displayState === 'hunting' ? pulseStyle : undefined,
        displayState === 'hunting' ? huntingPanelCss : undefined,
      ]}
    >
      {displayState === 'hunting' ? (
        <EuiFlexGroup alignItems="flexStart" responsive={false} gutterSize="none">
          <EuiFlexItem grow={2}>
            <div css={columnGridCss}>
              <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <span css={huntingDotCss} aria-hidden />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" css={css({ color: euiTheme.colors.primary, lineHeight: 1.2 })}>
                    <strong data-test-subj="threatIntelContinuousHuntHuntingTitle">
                      {i18n.translate(
                        'xpack.securitySolution.threatIntelligence.app.continuousHuntHuntingNow',
                        {
                          defaultMessage: 'Hunting now: {reportTitle}',
                          values: { reportTitle },
                        }
                      )}
                    </strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiText
                size="xs"
                color="subdued"
                data-test-subj="threatIntelContinuousHuntHuntingSub"
              >
                {status.tier?.label ??
                  i18n.translate(
                    'xpack.securitySolution.threatIntelligence.app.continuousHuntHuntingSubtitleDefault',
                    { defaultMessage: 'Running Tier 1 and Tier 2…' }
                  )}
              </EuiText>
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={2} css={columnDividerCss}>
            <div css={columnGridCss}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem>
                  <EuiProgress
                    value={tierProgressValue}
                    max={100}
                    size="s"
                    color="primary"
                    data-test-subj="threatIntelContinuousHuntTierProgress"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate(
                      'xpack.securitySolution.threatIntelligence.app.continuousHuntTierOfTotal',
                      {
                        defaultMessage: 'Tier {current} of {total}',
                        values: { current: tierCurrent, total: tierTotal },
                      }
                    )}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiText size="xs" color="subdued">
                {thisCycleLabel}
              </EuiText>
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={1} css={columnDividerCss}>
            <div css={[columnGridCss, css({ textAlign: 'right' })]}>
              <EuiText size="s" css={css({ lineHeight: 1.2 })}>
                <strong data-test-subj="threatIntelContinuousHuntReportProgress">
                  {i18n.translate(
                    'xpack.securitySolution.threatIntelligence.app.continuousHuntReportProgress',
                    {
                      defaultMessage: 'Report {current} of {total} in this cycle',
                      values: {
                        current: status.report?.index ?? 1,
                        total: status.report?.total ?? (status.reports_hunted_last_cycle || 1),
                      },
                    }
                  )}
                </strong>
              </EuiText>
              <EuiText
                size="xs"
                color="subdued"
                data-test-subj="threatIntelContinuousHuntStartedAgo"
              >
                {i18n.translate(
                  'xpack.securitySolution.threatIntelligence.app.continuousHuntStartedAgoLive',
                  {
                    defaultMessage: 'Started {ago}',
                    values: { ago: startedAgo },
                  }
                )}
              </EuiText>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiFlexGroup alignItems="flexStart" responsive={false} gutterSize="none">
          <EuiFlexItem grow={1}>
            <ContinuousHuntLeftColumn
              reportsHunted={status.reports_hunted_last_cycle}
              lastRun={lastRunLabel}
              nextRun={nextRunLabel}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1} css={columnDividerCss}>
            {displayState === 'new_findings' ? (
              <div data-test-subj="threatIntelContinuousHuntMiddleNewFindings" css={columnGridCss}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
                  <EuiFlexItem grow={false}>
                    <EuiBadge
                      color="warning"
                      data-test-subj="threatIntelContinuousHuntNewFindingsBadge"
                    >
                      {i18n.translate(
                        'xpack.securitySolution.threatIntelligence.app.continuousHuntNewFindingsBadgeLive',
                        {
                          defaultMessage:
                            '{count, plural, one {# new finding} other {# new findings}}',
                          values: { count: status.findings.new_count },
                        }
                      )}
                    </EuiBadge>
                  </EuiFlexItem>
                  {status.findings.suppressed_count > 0 ? (
                    <EuiFlexItem grow={false}>
                      <EuiText
                        size="xs"
                        color="subdued"
                        data-test-subj="threatIntelContinuousHuntSuppressed"
                      >
                        {i18n.translate(
                          'xpack.securitySolution.threatIntelligence.app.continuousHuntSuppressedCountLive',
                          {
                            defaultMessage:
                              '{count, plural, one {# duplicate suppressed} other {# duplicates suppressed}}',
                            values: { count: status.findings.suppressed_count },
                          }
                        )}
                      </EuiText>
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
                <EuiText size="xs" color="subdued">
                  {thisCycleLabel}
                </EuiText>
              </div>
            ) : (
              <div data-test-subj="threatIntelContinuousHuntQuietMessage" css={columnGridCss}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="success">
                      {i18n.translate(
                        'xpack.securitySolution.threatIntelligence.app.continuousHuntNoNewFindingsBadge',
                        { defaultMessage: 'No new findings' }
                      )}
                    </EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {typeof status.findings.indicators_rechecked === 'number'
                        ? i18n.translate(
                            'xpack.securitySolution.threatIntelligence.app.continuousHuntIndicatorsRecheckedLive',
                            {
                              defaultMessage:
                                'All {count, plural, one {# known indicator} other {# known indicators}} re-checked',
                              values: { count: status.findings.indicators_rechecked },
                            }
                          )
                        : i18n.translate(
                            'xpack.securitySolution.threatIntelligence.app.continuousHuntQuietRecheckFallback',
                            { defaultMessage: 'No new environment hits this cycle' }
                          )}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiText size="xs" color="subdued">
                  {thisCycleLabel}
                </EuiText>
              </div>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={columnDividerCss}>
            <BarSparkline
              values={sparklineValues}
              label={sparklineLabel}
              testSubj="threatIntelContinuousHuntSparkline"
              quiet={displayState === 'quiet'}
              badge={displayState === 'quiet' ? quietBadge : undefined}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};

export const ContinuousHuntStatusStrip = React.memo(ContinuousHuntStatusStripComponent);
