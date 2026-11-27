/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import moment from 'moment';
import { Axis, BarSeries, Chart, Position, ScaleType, Settings } from '@elastic/charts';
import { EuiPanel, EuiSpacer, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import {
  buildSessionDays,
  summariseSessions,
} from '../../../../../entity_analytics/components/ai_security/activity/build_agent_sessions';
import type {
  AgentSessions,
  LaunchMode,
} from '../../../../../entity_analytics/components/ai_security/activity/types';
import { AI_AGENT_TEST_IDS } from '../test_ids';
import { LAUNCH_MODE_LABELS } from './session_labels';

const DAY_MS = 86_400_000;
const LAUNCH_MODE_ORDER: readonly LaunchMode[] = [
  'interactive',
  'scheduled',
  'scripted',
  'unknown',
];

const SESSIONS_SERIES = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.summary.sessionsSeries',
  { defaultMessage: 'Sessions' }
);
const WITH_ALERTS_SERIES = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.summary.withAlertsSeries',
  { defaultMessage: 'Sessions with alerts' }
);
const HISTOGRAM_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.summary.histogramTitle',
  { defaultMessage: 'Sessions per day' }
);
const HEADLESS = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.summary.headless',
  { defaultMessage: 'Headless' }
);
const PERMISSION_PROMPTS_OFF = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.summary.permissionPromptsOff',
  { defaultMessage: 'Permission prompts off' }
);
const WITH_ALERTS = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.summary.withAlerts',
  { defaultMessage: 'With alerts' }
);

const countLabel = (label: string, count: number): string =>
  i18n.translate('xpack.securitySolution.flyout.entityDetails.aiAgent.activity.summary.count', {
    defaultMessage: '{label}: {count}',
    values: { label, count },
  });

/** "{count} sessions in the last 30 days", or "At least" when the read hit its limit. */
export const getSessionsTitle = (count: number, truncated: boolean): string =>
  truncated
    ? i18n.translate(
        'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.summary.titleAtLeast',
        {
          defaultMessage:
            'At least {count, plural, one {# session} other {# sessions}} in the last 30 days',
          values: { count },
        }
      )
    : i18n.translate('xpack.securitySolution.flyout.entityDetails.aiAgent.activity.summary.title', {
        defaultMessage: '{count, plural, one {# session} other {# sessions}} in the last 30 days',
        values: { count },
      });

export interface SessionsSummaryProps {
  readonly data: AgentSessions;
}

/**
 * The top of the Agent activity tab: how many sessions in the window, how they were launched, and
 * sessions per day. Days with no sessions show as zero so gaps are visible, and sessions with
 * alerts are stacked in the danger colour.
 */
export const SessionsSummary = memo(({ data }: SessionsSummaryProps) => {
  const { euiTheme } = useEuiTheme();
  const chartsTheme = useElasticChartsTheme();
  const { sessions, window, truncated } = data;
  const summary = useMemo(() => summariseSessions(sessions), [sessions]);
  const days = useMemo(
    () =>
      buildSessionDays(sessions, window).map(({ day, sessions: count, sessionsWithAlerts }) => ({
        day,
        quiet: count - sessionsWithAlerts,
        alerted: sessionsWithAlerts,
      })),
    [sessions, window]
  );

  const launchParts = LAUNCH_MODE_ORDER.filter((mode) => summary.byLaunchMode[mode] > 0).map(
    (mode) => countLabel(LAUNCH_MODE_LABELS[mode], summary.byLaunchMode[mode])
  );
  const flagParts = [
    ...(summary.headless > 0 ? [countLabel(HEADLESS, summary.headless)] : []),
    ...(summary.permissionPromptsOff > 0
      ? [countLabel(PERMISSION_PROMPTS_OFF, summary.permissionPromptsOff)]
      : []),
    ...(summary.withAlerts > 0 ? [countLabel(WITH_ALERTS, summary.withAlerts)] : []),
  ];

  return (
    <EuiPanel hasBorder paddingSize="s" data-test-subj={AI_AGENT_TEST_IDS.sessionsSummary}>
      <EuiTitle size="xxs">
        <h4>{getSessionsTitle(sessions.length, truncated)}</h4>
      </EuiTitle>
      {launchParts.length > 0 && (
        <EuiText size="xs" color="subdued" data-test-subj={AI_AGENT_TEST_IDS.sessionsLaunchModes}>
          {launchParts.join(' · ')}
        </EuiText>
      )}
      {flagParts.length > 0 && (
        <EuiText size="xs" color="subdued" data-test-subj={AI_AGENT_TEST_IDS.sessionsFlags}>
          {flagParts.join(' · ')}
        </EuiText>
      )}
      <EuiSpacer size="s" />
      <div
        data-test-subj={AI_AGENT_TEST_IDS.sessionsHistogram}
        css={css`
          height: ${summary.withAlerts > 0 ? 180 : 120}px;
        `}
      >
        <Chart title={HISTOGRAM_TITLE}>
          <Settings
            baseTheme={chartsTheme}
            showLegend={summary.withAlerts > 0}
            legendPosition={Position.Bottom}
            xDomain={{
              min: days[0]?.day,
              max: days[days.length - 1]?.day,
              minInterval: DAY_MS,
            }}
            theme={{ chartMargins: { top: 4, right: 4, bottom: 0, left: 0 } }}
          />
          <Axis
            id="sessions-day"
            position={Position.Bottom}
            tickFormat={(value) => moment(value).format('MMM D')}
            gridLine={{ visible: false }}
          />
          <Axis
            id="sessions-count"
            position={Position.Left}
            maximumFractionDigits={0}
            ticks={3}
            gridLine={{ visible: true }}
          />
          <BarSeries
            id="sessions"
            name={SESSIONS_SERIES}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="day"
            yAccessors={['quiet']}
            stackAccessors={['day']}
            color={euiTheme.colors.vis.euiColorVis0}
            data={days}
          />
          <BarSeries
            id="sessions-with-alerts"
            name={WITH_ALERTS_SERIES}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="day"
            yAccessors={['alerted']}
            stackAccessors={['day']}
            color={euiTheme.colors.danger}
            data={days}
          />
        </Chart>
      </div>
    </EuiPanel>
  );
});
SessionsSummary.displayName = 'SessionsSummary';
