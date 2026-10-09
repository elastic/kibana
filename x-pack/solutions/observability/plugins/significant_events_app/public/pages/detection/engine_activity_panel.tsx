/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';
import { formatTimestamp } from '../../util/formatters';
import { useMaintenanceStatus } from '../../hooks/use_significant_events_maintenance';
import { useEngineActivity, type EngineRun } from './use_engine_activity';
import { useEngineSettings } from './use_engine_settings';
import { useSignificantEventsDiscoveryApi } from '../../hooks/use_significant_events_discovery_api';
import { journey } from './journey_translations';

const pulse = keyframes`
  0%, 100% { transform: scaleY(.35); opacity: .45; }
  50% { transform: scaleY(1); opacity: 1; }
`;
const copy = {
  engine: i18n.translate('xpack.significantEventsApp.activityStrip.engine', {
    defaultMessage: 'Engine',
  }),
  offline: i18n.translate('xpack.significantEventsApp.activityStrip.offline', {
    defaultMessage: 'Offline',
  }),
  live: i18n.translate('xpack.significantEventsApp.activityStrip.live', { defaultMessage: 'Live' }),
  monitoring: i18n.translate('xpack.significantEventsApp.activityStrip.monitoring', {
    defaultMessage: 'Monitoring',
  }),
  finding: i18n.translate('xpack.significantEventsApp.activityStrip.finding', {
    defaultMessage: 'Finding significant events',
  }),
  latest: i18n.translate('xpack.significantEventsApp.activityStrip.latest', {
    defaultMessage: 'Latest activity',
  }),
  starting: i18n.translate('xpack.significantEventsApp.activityStrip.starting', {
    defaultMessage: 'Starting discovery',
  }),
};
const jobs = {
  pipeline: { title: copy.finding, icon: 'inspect' },
  learning: { title: journey.learning, icon: 'documents' },
  evaluation: { title: journey.evaluating, icon: 'visLine' },
  discovery: { title: journey.discovery, icon: 'inspect' },
  review: { title: journey.review, icon: 'bell' },
} as const;

const runLabel = (run: EngineRun): string =>
  run.active
    ? journey.inProgress
    : run.status === 'completed'
    ? journey.completed
    : run.error
    ? journey.failed
    : run.status.replace(/_/g, ' ');
const stepLabel = (name: string): string =>
  name.replace(/[_-]/g, ' ').replace(/^./, (letter) => letter.toUpperCase());

export const EngineActivityPanel = ({
  streams,
  expanded = false,
  onOpenActivity,
  headerAction,
  title,
  minimal = false,
  integrated = false,
}: {
  streams?: string[];
  expanded?: boolean;
  onOpenActivity?: () => void;
  headerAction?: React.ReactNode;
  title?: string;
  minimal?: boolean;
  integrated?: boolean;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const id = useGeneratedHtmlId({ prefix: 'engineActivity' });
  const activity = useEngineActivity({ live: true });
  const { core } = useKibana();
  const { triggerSignificantEventsDiscovery } = useSignificantEventsDiscoveryApi();
  const canManage = getNightshiftCapabilities(core.application.capabilities.nightshift).canManage;
  const [triggering, setTriggering] = useState(false);
  const trigger = async (): Promise<void> => {
    setTriggering(true);
    try {
      await triggerSignificantEventsDiscovery();
      await activity.refetch();
      core.notifications.toasts.addSuccess(journey.discoveryStarted);
    } catch (error) {
      core.notifications.toasts.addDanger({
        title: journey.error,
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setTriggering(false);
    }
  };
  const maintenance = useMaintenanceStatus();
  const preferences = useEngineSettings();
  const limitReached = Boolean(
    preferences.data?.dailyDiscoveryLimit &&
      (preferences.data.usage[new Date().toISOString().slice(0, 10)] ?? 0) >=
        preferences.data.dailyDiscoveryLimit
  );
  const discoveryPaused = preferences.data?.discoveryPaused || limitReached;
  const runs = (activity.data?.runs ?? []).filter(
    (run) => !expanded || !streams || !run.stream || streams.includes(run.stream)
  );
  const watched = activity.data?.streams.filter((stream) => stream.watched) ?? [];
  const learningEnabled = maintenance.data?.featureSettings?.continuousOnboardingEnabled;
  const scheduledEnabled = maintenance.data?.featureSettings?.scheduledDiscoveryEnabled;
  const paused = maintenance.data && maintenance.data.state !== 'enabled';
  const activeRuns = runs.filter((run) => run.active);
  const activeGroups = Object.entries(jobs).flatMap(([kind, job]) => {
    const matching = activeRuns.filter((run) => run.kind === kind);
    return matching.length ? [{ kind, ...job, runs: matching }] : [];
  });
  const latest = runs[0];
  const unavailable = activity.isError || maintenance.isError || activity.data?.available === false;
  const active = activeRuns.length > 0 || triggering;
  const state = active
    ? i18n.translate('xpack.significantEventsApp.activityStrip.running', {
        defaultMessage: '{count, plural, one {# running} other {# running}}',
        values: { count: activeRuns.length || 1 },
      })
    : unavailable
    ? journey.engineUnavailable
    : !activity.data || !maintenance.data
    ? journey.waiting
    : paused
    ? journey.paused
    : !watched.length
    ? journey.off
    : (learningEnabled &&
        watched.some((stream) => !preferences.data?.pausedStreams.includes(stream.name))) ||
      (scheduledEnabled && !discoveryPaused)
    ? copy.monitoring
    : journey.idle;
  const orderedRuns = [...runs].sort((a, b) => Number(b.active) - Number(a.active));
  const color = active
    ? euiTheme.colors.primary
    : unavailable
    ? euiTheme.colors.warning
    : euiTheme.colors.textSubdued;
  if (minimal) {
    const learningAllowed =
      learningEnabled &&
      watched.some((stream) => !preferences.data?.pausedStreams.includes(stream.name));
    const discoveryAllowed = scheduledEnabled && !discoveryPaused;
    const allPaused =
      paused || (preferences.data && watched.length > 0 && !learningAllowed && !discoveryAllowed);
    const agentState = active ? journey.running : allPaused ? journey.paused : journey.idle;
    const status = unavailable
      ? journey.engineUnavailable
      : !activity.data || !maintenance.data || !preferences.data
      ? journey.waiting
      : i18n.translate('xpack.significantEventsApp.pocMode.agentStatus', {
          defaultMessage: 'Agent · {status}',
          values: { status: agentState },
        });
    return (
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m" wrap>
        <EuiFlexItem grow={false}>
          <span role="status" aria-live="polite">
            <EuiBadge
              color={unavailable || allPaused ? 'warning' : active ? 'primary' : 'hollow'}
              iconType={active ? 'dot' : allPaused ? 'pause' : 'clock'}
              data-test-subj="detectionPocAgentStatus"
            >
              {status}
            </EuiBadge>
          </span>
        </EuiFlexItem>
        {headerAction && <EuiFlexItem grow={false}>{headerAction}</EuiFlexItem>}
      </EuiFlexGroup>
    );
  }
  return (
    <EuiPanel
      hasBorder={expanded}
      hasShadow={false}
      paddingSize={expanded ? 's' : 'none'}
      data-test-subj="detectionEngineActivity"
      css={css`
        background: ${integrated
          ? 'transparent'
          : active
          ? `linear-gradient(110deg, color-mix(in srgb, ${euiTheme.colors.primary} 9%, ${euiTheme.colors.backgroundBasePlain}), ${euiTheme.colors.backgroundBasePlain} 70%)`
          : euiTheme.colors.backgroundBasePlain};
        border-color: ${active
          ? `color-mix(in srgb, ${euiTheme.colors.primary} 35%, ${euiTheme.colors.borderBasePlain})`
          : euiTheme.colors.borderBasePlain};
        transition: background 200ms ease, border-color 200ms ease;
      `}
    >
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        wrap
        css={css`
          min-height: 28px;
        `}
      >
        <EuiFlexItem grow={false}>
          <div
            aria-hidden={true}
            css={css`
              display: flex;
              gap: 3px;
              align-items: center;
              justify-content: center;
              width: 28px;
              height: 28px;
              border-radius: ${euiTheme.border.radius.medium};
              background: color-mix(in srgb, ${color} 10%, transparent);
              color: ${color};
            `}
          >
            {[8, 16, 22, 13, 7].map((height, index) => (
              <span
                key={index}
                style={{ height, animationDelay: `${index * 130}ms` }}
                css={css`
                  display: block;
                  width: 3px;
                  border-radius: 3px;
                  background: currentColor;
                  opacity: ${active ? 1 : 0.45};
                  animation: ${active ? pulse : 'none'} 1100ms ease-in-out infinite;
                  @media (prefers-reduced-motion: reduce) {
                    animation: none;
                  }
                `}
              />
            ))}
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div
            css={css`
              display: flex;
              align-items: center;
              gap: ${euiTheme.size.s};
              font-size: ${euiTheme.font.scale.xs}rem;
            `}
          >
            <strong
              css={css`
                font-size: ${integrated ? euiTheme.font.scale.s : euiTheme.font.scale.xs}rem;
              `}
            >
              {title || copy.engine}
            </strong>
            <span
              role="status"
              aria-live="polite"
              css={css`
                color: ${unavailable ? euiTheme.colors.warning : euiTheme.colors.textSubdued};
              `}
            >
              {state}
            </span>
            {integrated && (
              <EuiToolTip
                content={i18n.translate('xpack.significantEventsApp.activityStrip.refreshHint', {
                  defaultMessage: 'Activity updates every second',
                })}
              >
                <EuiBadge color={unavailable ? 'warning' : 'hollow'} iconType="dot" tabIndex={0}>
                  {unavailable ? copy.offline : !activity.data ? journey.waiting : copy.live}
                </EuiBadge>
              </EuiToolTip>
            )}
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
            {activeGroups.map((group) => (
              <EuiFlexItem grow={false} key={group.kind}>
                <EuiToolTip
                  content={
                    <EuiText size="xs">
                      {group.runs.map((run) => (
                        <p key={run.id}>
                          {run.stream || group.title} ·{' '}
                          {run.steps
                            .filter((step) => step.active)
                            .map((step) => stepLabel(step.name))
                            .join(' · ') || runLabel(run)}
                        </p>
                      ))}
                    </EuiText>
                  }
                >
                  <EuiBadge
                    color="hollow"
                    tabIndex={onOpenActivity ? undefined : 0}
                    iconType={group.icon}
                    onClick={onOpenActivity}
                    onClickAriaLabel={i18n.translate(
                      'xpack.significantEventsApp.activityStrip.openRuns',
                      {
                        defaultMessage: 'View {activity} runs',
                        values: { activity: group.title },
                      }
                    )}
                    css={css`
                      border-color: color-mix(in srgb, ${euiTheme.colors.primary} 35%, transparent);
                      background: color-mix(in srgb, ${euiTheme.colors.primary} 8%, transparent);
                      padding: ${euiTheme.size.xs} ${euiTheme.size.s};
                    `}
                  >
                    {group.title}
                    {group.runs.length > 1 ? ` ×${group.runs.length}` : ''}
                  </EuiBadge>
                </EuiToolTip>
              </EuiFlexItem>
            ))}
            {triggering && !activeGroups.length && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <EuiLoadingSpinner size="s" /> {copy.starting}
                </EuiText>
              </EuiFlexItem>
            )}
            {!active && latest && (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={`${copy.latest} · ${jobs[latest.kind].title} · ${runLabel(
                    latest
                  )} · ${formatTimestamp(latest.finishedAt || latest.startedAt)}${
                    latest.error ? ` · ${latest.error}` : ''
                  }`}
                >
                  <EuiText size="xs" color="subdued" tabIndex={0} aria-label={copy.latest}>
                    <span>
                      <EuiIcon
                        type={latest.error ? 'warning' : 'clock'}
                        size="s"
                        aria-hidden={true}
                      />{' '}
                      {expanded && `${jobs[latest.kind].title} · ${runLabel(latest)}`}
                    </span>
                  </EuiText>
                </EuiToolTip>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        {expanded && canManage && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="significantEventsAppEngineActivityPanelButton"
              size="xs"
              iconType="play"
              isLoading={triggering}
              isDisabled={Boolean(
                paused ||
                  discoveryPaused ||
                  triggering ||
                  activeRuns.some((run) => run.kind === 'discovery' || run.kind === 'pipeline')
              )}
              onClick={trigger}
            >
              {journey.startDiscovery}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        {!integrated && (
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.significantEventsApp.activityStrip.refreshHint', {
                defaultMessage: 'Activity updates every second',
              })}
            >
              <EuiBadge color={unavailable ? 'warning' : 'hollow'} iconType="dot" tabIndex={0}>
                {unavailable ? copy.offline : !activity.data ? journey.waiting : copy.live}
              </EuiBadge>
            </EuiToolTip>
          </EuiFlexItem>
        )}
        {headerAction && <EuiFlexItem grow={false}>{headerAction}</EuiFlexItem>}
      </EuiFlexGroup>
      {unavailable && expanded && (
        <EuiCallOut announceOnMount size="s" color="warning" title={journey.engineUnavailable}>
          <p>
            {activity.error instanceof Error ? activity.error.message : maintenance.error?.message}
          </p>
        </EuiCallOut>
      )}
      {expanded && (
        <>
          <EuiSpacer size="l" />
          <EuiTitle size="xxs">
            <h3>{journey.recentRuns}</h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          {runs.length === 0 && (
            <EuiText size="s" color="subdued">
              <p>{journey.noRunsHint}</p>
            </EuiText>
          )}
          {orderedRuns.slice(0, 40).map((run) => (
            <div
              key={run.id}
              css={css`
                padding: ${euiTheme.size.m} 0;
                border-top: 1px solid ${euiTheme.colors.borderBasePlain};
              `}
            >
              <EuiAccordion
                id={`${id}-${run.id}`}
                buttonContent={
                  <EuiFlexGroup alignItems="center" gutterSize="m">
                    <EuiFlexItem grow={false}>
                      <EuiBadge color={run.error ? 'danger' : run.active ? 'primary' : 'hollow'}>
                        {runLabel(run)}
                      </EuiBadge>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <p>{run.stream || jobs[run.kind].title}</p>
                      </EuiText>
                      <EuiText size="xs" color="subdued">
                        <p>{formatTimestamp(run.startedAt)}</p>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                paddingSize="m"
              >
                {run.error && (
                  <EuiCallOut announceOnMount size="s" title={run.error} color="danger" />
                )}
                {run.steps.length === 0 ? (
                  <EuiText size="xs" color="subdued">
                    <p>
                      {run.finishedAt ? formatTimestamp(run.finishedAt) : journey.noStepEstimate}
                    </p>
                  </EuiText>
                ) : (
                  run.steps.map((step) => (
                    <EuiFlexGroup
                      key={step.id}
                      alignItems="center"
                      gutterSize="s"
                      css={css`
                        padding: ${euiTheme.size.s} 0;
                      `}
                    >
                      <EuiFlexItem grow={false}>
                        {step.active ? (
                          <EuiLoadingSpinner size="s" />
                        ) : (
                          <EuiIcon
                            type={
                              step.error
                                ? 'warning'
                                : step.status === 'completed'
                                ? 'check'
                                : 'clock'
                            }
                            color={step.error ? 'danger' : 'subdued'}
                            aria-hidden={true}
                          />
                        )}
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="xs">
                          <p>{stepLabel(step.name)}</p>
                          {step.error && <p>{step.error}</p>}
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="subdued">
                          <p>{step.startedAt ? formatTimestamp(step.startedAt) : ''}</p>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ))
                )}
              </EuiAccordion>
            </div>
          ))}
        </>
      )}
    </EuiPanel>
  );
};
