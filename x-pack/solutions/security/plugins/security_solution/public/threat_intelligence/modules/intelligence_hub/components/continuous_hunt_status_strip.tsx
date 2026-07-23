/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiPanel,
  EuiProgress,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import {
  HUNT_STATUS_API_PATH,
  type HuntStatusResponse,
} from '../../../../../common/threat_intelligence/hub';
import { useKibana } from '../../../../common/lib/kibana';

/**
 * Continuous-hunt status strip. Everything rendered here is real state
 * fetched from `GET /api/threat_intelligence/hunt_status` (workflow
 * execution history + hunt-findings / report-feedback stats) — no
 * synthetic countdowns. Polls on an interval, tightening while a hunt
 * execution is in flight so the running → idle transition shows up
 * without a page refresh.
 */

const IDLE_POLL_MS = 30_000;
const RUNNING_POLL_MS = 3_000;

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

/** "Xs ago" / "X min ago" / "Xh ago" / "Xd ago" from an ISO timestamp. */
const formatAgo = (iso: string, nowMs: number): string => {
  const thenMs = Date.parse(iso);
  if (Number.isNaN(thenMs)) return '';
  const deltaSec = Math.max(0, Math.round((nowMs - thenMs) / 1000));
  if (deltaSec < 60) {
    return i18n.translate('xpack.securitySolution.threatIntelligence.app.continuousHuntAgoSec', {
      defaultMessage: '{seconds}s ago',
      values: { seconds: deltaSec },
    });
  }
  const deltaMin = Math.round(deltaSec / 60);
  if (deltaMin < 60) {
    return i18n.translate('xpack.securitySolution.threatIntelligence.app.continuousHuntAgoMin', {
      defaultMessage: '{minutes} min ago',
      values: { minutes: deltaMin },
    });
  }
  const deltaHours = Math.round(deltaMin / 60);
  if (deltaHours < 48) {
    return i18n.translate('xpack.securitySolution.threatIntelligence.app.continuousHuntAgoHours', {
      defaultMessage: '{hours}h ago',
      values: { hours: deltaHours },
    });
  }
  return i18n.translate('xpack.securitySolution.threatIntelligence.app.continuousHuntAgoDays', {
    defaultMessage: '{days}d ago',
    values: { days: Math.round(deltaHours / 24) },
  });
};

/** "Next in X min" / "Next in Xh" from a future ISO timestamp. */
const formatNextIn = (iso: string, nowMs: number): string | undefined => {
  const thenMs = Date.parse(iso);
  if (Number.isNaN(thenMs) || thenMs <= nowMs) return undefined;
  const deltaMin = Math.max(1, Math.round((thenMs - nowMs) / 60_000));
  if (deltaMin < 60) {
    return i18n.translate('xpack.securitySolution.threatIntelligence.app.continuousHuntNextIn', {
      defaultMessage: 'Next in {minutes} min',
      values: { minutes: deltaMin },
    });
  }
  return i18n.translate('xpack.securitySolution.threatIntelligence.app.continuousHuntNextInHours', {
    defaultMessage: 'Next in {hours}h',
    values: { hours: Math.round(deltaMin / 60) },
  });
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

interface LeftColumnProps {
  health: 'success' | 'danger' | 'subdued';
  statusLabel: string;
  badgeLabel?: string;
  metaText: string;
}

const ContinuousHuntLeftColumn: React.FC<LeftColumnProps> = ({
  health,
  statusLabel,
  badgeLabel,
  metaText,
}) => {
  const { euiTheme } = useEuiTheme();
  const statusColor =
    health === 'success'
      ? euiTheme.colors.success
      : health === 'danger'
      ? euiTheme.colors.danger
      : euiTheme.colors.subduedText;

  return (
    <div data-test-subj="threatIntelContinuousHuntLeftColumn" css={columnGridCss}>
      <EuiHealth color={health === 'subdued' ? 'subdued' : health}>
        <EuiText size="s" css={css({ color: statusColor, lineHeight: 1.2 })}>
          <strong>{statusLabel}</strong>
        </EuiText>
      </EuiHealth>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
        {badgeLabel ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="threatIntelContinuousHuntCycleStats">
              {badgeLabel}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued" data-test-subj="threatIntelContinuousHuntRunMeta">
            {metaText}
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
  const [status, setStatus] = useState<HuntStatusResponse | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const mountedRef = useRef(true);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await http.get<HuntStatusResponse>(HUNT_STATUS_API_PATH, {
        version: '2023-10-31',
      });
      if (mountedRef.current) {
        setStatus(response);
        setNowMs(Date.now());
      }
    } catch {
      // Transient fetch failures keep the previous status on screen.
    }
  }, [http]);

  const isRunning = status?.current_run != null;

  useEffect(() => {
    mountedRef.current = true;
    fetchStatus();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchStatus]);

  useEffect(() => {
    const interval = setInterval(fetchStatus, isRunning ? RUNNING_POLL_MS : IDLE_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchStatus, isRunning]);

  // Keep the "Xs ago" labels moving between polls while a hunt runs.
  useEffect(() => {
    if (!isRunning) return;
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [isRunning]);

  // Match the page header / template background (lighter than lightestShade panels).
  const stripPanelCss = css({
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
  });

  if (!status || !status.workflow_found) {
    // No workflow installed (or first fetch still in flight): render
    // nothing rather than fake chrome.
    return null;
  }

  const { current_run: currentRun, last_run: lastRun, cycle, totals, schedule } = status;

  const sparklineLabel = i18n.translate(
    'xpack.securitySolution.threatIntelligence.app.continuousHuntActivitySparklineLabel',
    { defaultMessage: 'Findings · 24h' }
  );
  const thisCycleLabel = i18n.translate(
    'xpack.securitySolution.threatIntelligence.app.continuousHuntThisCycle',
    { defaultMessage: 'Last cycle' }
  );

  if (currentRun) {
    const huntingPanelCss = css({ borderColor: euiTheme.colors.primary });
    const huntingDotCss = css({
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      backgroundColor: euiTheme.colors.primary,
      marginRight: euiTheme.size.s,
      flexShrink: 0,
    });
    const huntingTitle = currentRun.current_report_title
      ? i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.continuousHuntHuntingNowTitle',
          {
            defaultMessage: 'Hunting now: {reportTitle}',
            values: { reportTitle: currentRun.current_report_title },
          }
        )
      : currentRun.current_report_id
      ? i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.continuousHuntHuntingNowReportId',
          {
            defaultMessage: 'Hunting now: {reportId}',
            values: { reportId: currentRun.current_report_id },
          }
        )
      : i18n.translate('xpack.securitySolution.threatIntelligence.app.continuousHuntHuntingNow', {
          defaultMessage: 'Hunt in progress',
        });
    const reportIndex = currentRun.current_report_index;
    const reportsTotal = currentRun.reports_total;
    const hasReportProgress =
      typeof reportIndex === 'number' &&
      reportIndex > 0 &&
      typeof reportsTotal === 'number' &&
      reportsTotal > 0;

    const stepLabel = (() => {
      if (currentRun.current_step_id === 'load_hunt_candidates') {
        return i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.continuousHuntStepLoadCandidates',
          { defaultMessage: 'Selecting top reports to hunt…' }
        );
      }
      if (hasReportProgress) {
        return i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.continuousHuntReportOfTotalSub',
          {
            defaultMessage: 'Report {current} of {total} · Tier 1 + Tier 2 analysis',
            values: { current: reportIndex, total: reportsTotal },
          }
        );
      }
      if (currentRun.current_step_id === 'hunt_each_report') {
        return i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.continuousHuntStepHuntEach',
          { defaultMessage: 'Working through candidate reports…' }
        );
      }
      if (currentRun.current_step_id === 'run_hunt_orchestrator') {
        return i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.continuousHuntStepOrchestrator',
          { defaultMessage: 'Running Tier 1 + Tier 2 hunt…' }
        );
      }
      if (!currentRun.current_step_id) {
        return i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.continuousHuntStarting',
          { defaultMessage: 'Starting up…' }
        );
      }
      return i18n.translate(
        'xpack.securitySolution.threatIntelligence.app.continuousHuntCurrentStep',
        {
          defaultMessage: 'Running step: {stepId}',
          values: { stepId: currentRun.current_step_id },
        }
      );
    })();

    const reportsCompleted = currentRun.reports_completed ?? 0;
    const progressCurrent = hasReportProgress
      ? Math.min(reportIndex, reportsTotal)
      : reportsCompleted;
    const progressMax = hasReportProgress
      ? reportsTotal
      : reportsTotal && reportsTotal > 0
      ? reportsTotal
      : undefined;
    const stepsProgressLabel = hasReportProgress
      ? i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.continuousHuntReportOfTotal',
          {
            defaultMessage: '{current} of {total}',
            values: { current: reportIndex, total: reportsTotal },
          }
        )
      : typeof reportsTotal === 'number' && reportsTotal > 0
      ? i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.continuousHuntReportsCompletedOfTotal',
          {
            defaultMessage: '{completed} of {total} reports',
            values: { completed: reportsCompleted, total: reportsTotal },
          }
        )
      : i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.continuousHuntReportsCompleted',
          {
            defaultMessage: '{completed, plural, one {# report done} other {# reports done}}',
            values: { completed: reportsCompleted },
          }
        );

    return (
      <EuiPanel
        hasBorder
        paddingSize="m"
        data-test-subj="threatIntelContinuousHuntStatusStrip"
        css={[stripPanelCss, pulseStyle, huntingPanelCss]}
      >
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
                      {huntingTitle}
                    </strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiText
                size="xs"
                color="subdued"
                data-test-subj="threatIntelContinuousHuntHuntingSub"
              >
                {stepLabel}
              </EuiText>
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={2} css={columnDividerCss}>
            <div css={columnGridCss}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem>
                  <EuiProgress
                    value={progressMax ? progressCurrent : undefined}
                    max={progressMax}
                    size="s"
                    color="primary"
                    data-test-subj="threatIntelContinuousHuntTierProgress"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText
                    size="xs"
                    color="subdued"
                    data-test-subj="threatIntelContinuousHuntReportCount"
                  >
                    {stepsProgressLabel}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiText size="xs" color="subdued">
                {i18n.translate(
                  'xpack.securitySolution.threatIntelligence.app.continuousHuntReportsThisRun',
                  { defaultMessage: 'Reports this run' }
                )}
              </EuiText>
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={1} css={columnDividerCss}>
            <div css={[columnGridCss, css({ textAlign: 'right' })]}>
              <EuiText size="s" css={css({ lineHeight: 1.2 })}>
                <strong data-test-subj="threatIntelContinuousHuntReportProgress">
                  {i18n.translate(
                    'xpack.securitySolution.threatIntelligence.app.continuousHuntStartedAgo',
                    {
                      defaultMessage: 'Started {ago}',
                      values: { ago: formatAgo(currentRun.started_at, nowMs) },
                    }
                  )}
                </strong>
              </EuiText>
              <EuiText size="xs" color="subdued">
                {lastRun
                  ? i18n.translate(
                      'xpack.securitySolution.threatIntelligence.app.continuousHuntPrevRun',
                      {
                        defaultMessage: 'Previous run {ago}',
                        values: { ago: formatAgo(lastRun.started_at, nowMs) },
                      }
                    )
                  : ''}
              </EuiText>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  // --- Idle / failed / never-run states -------------------------------
  const nextRunLabel =
    schedule.armed && schedule.next_run_at ? formatNextIn(schedule.next_run_at, nowMs) : undefined;
  const cadenceLabel =
    nextRunLabel ??
    i18n.translate('xpack.securitySolution.threatIntelligence.app.continuousHuntOnDemand', {
      defaultMessage: 'On-demand',
    });

  let health: LeftColumnProps['health'] = 'subdued';
  let statusLabel = i18n.translate(
    'xpack.securitySolution.threatIntelligence.app.continuousHuntNoRuns',
    { defaultMessage: 'Continuous hunt — no runs yet' }
  );
  let metaText = cadenceLabel;
  let badgeLabel: string | undefined;

  if (lastRun) {
    const lastRunAgo = i18n.translate(
      'xpack.securitySolution.threatIntelligence.app.continuousHuntLastRunAgo',
      {
        defaultMessage: 'Last run {ago}',
        values: { ago: formatAgo(lastRun.started_at, nowMs) },
      }
    );
    metaText = `${lastRunAgo}${metaDot}${cadenceLabel}`;
    if (lastRun.status === 'failed') {
      health = 'danger';
      statusLabel = i18n.translate(
        'xpack.securitySolution.threatIntelligence.app.continuousHuntFailedStatus',
        { defaultMessage: 'Last hunt failed' }
      );
    } else {
      health = 'success';
      statusLabel = i18n.translate(
        'xpack.securitySolution.threatIntelligence.app.continuousHuntActiveStatus',
        { defaultMessage: 'Continuous hunt active' }
      );
    }
    if (cycle && cycle.reports_hunted > 0) {
      badgeLabel = i18n.translate(
        'xpack.securitySolution.threatIntelligence.app.continuousHuntReportsHuntedBadge',
        {
          defaultMessage: '{count, plural, one {# report hunted} other {# reports hunted}}',
          values: { count: cycle.reports_hunted },
        }
      );
    }
  }

  const hasNewFindings = Boolean(cycle && cycle.new_findings > 0);
  const quiet = Boolean(lastRun && lastRun.status === 'completed' && !hasNewFindings);

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      data-test-subj="threatIntelContinuousHuntStatusStrip"
      css={stripPanelCss}
    >
      <EuiFlexGroup alignItems="flexStart" responsive={false} gutterSize="none">
        <EuiFlexItem grow={1}>
          <ContinuousHuntLeftColumn
            health={health}
            statusLabel={statusLabel}
            badgeLabel={badgeLabel}
            metaText={metaText}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={1} css={columnDividerCss}>
          {hasNewFindings && cycle ? (
            <div data-test-subj="threatIntelContinuousHuntMiddleNewFindings" css={columnGridCss}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    color="warning"
                    data-test-subj="threatIntelContinuousHuntNewFindingsBadge"
                  >
                    {i18n.translate(
                      'xpack.securitySolution.threatIntelligence.app.continuousHuntNewFindingsBadge',
                      {
                        defaultMessage:
                          '{count, plural, one {# new finding} other {# new findings}}',
                        values: { count: cycle.new_findings },
                      }
                    )}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText
                    size="xs"
                    color="subdued"
                    data-test-subj="threatIntelContinuousHuntEnvHits"
                  >
                    {i18n.translate(
                      'xpack.securitySolution.threatIntelligence.app.continuousHuntEnvHitsCount',
                      {
                        defaultMessage:
                          '{count, plural, =0 {no environment hits} one {# with environment hits} other {# with environment hits}}',
                        values: { count: cycle.environment_hits },
                      }
                    )}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiText size="xs" color="subdued">
                {thisCycleLabel}
              </EuiText>
            </div>
          ) : (
            <div data-test-subj="threatIntelContinuousHuntQuietMessage" css={columnGridCss}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={quiet ? 'success' : 'hollow'}>
                    {quiet
                      ? i18n.translate(
                          'xpack.securitySolution.threatIntelligence.app.continuousHuntNoNewFindingsBadge',
                          { defaultMessage: 'No new findings' }
                        )
                      : i18n.translate(
                          'xpack.securitySolution.threatIntelligence.app.continuousHuntNoCycleBadge',
                          { defaultMessage: 'No cycle data' }
                        )}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate(
                      'xpack.securitySolution.threatIntelligence.app.continuousHuntTotalsRechecked',
                      {
                        defaultMessage:
                          '{findings} known {findings, plural, one {finding} other {findings}} across {reports} {reports, plural, one {report} other {reports}}',
                        values: {
                          findings: totals.findings,
                          reports: totals.reports_with_findings,
                        },
                      }
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
            values={status.activity_24h}
            label={sparklineLabel}
            testSubj="threatIntelContinuousHuntSparkline"
            quiet={quiet}
            badge={
              quiet ? (
                <EuiBadge color="hollow" data-test-subj="threatIntelContinuousHuntQuietPill">
                  {i18n.translate(
                    'xpack.securitySolution.threatIntelligence.app.continuousHuntQuietPill',
                    { defaultMessage: 'quiet' }
                  )}
                </EuiBadge>
              ) : undefined
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const ContinuousHuntStatusStrip = React.memo(ContinuousHuntStatusStripComponent);
