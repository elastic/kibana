/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SessionListKpis } from '../../../../common/sessions';
import type { Formatters } from '../../../hooks/use_formatters';
import { formatSessionDuration } from '../../../utils/format_session_duration';

/** Shown for a KPI without data, e.g. the median duration of no sessions. */
const NO_VALUE = '—';

const withValue = <T,>(value: T | null | undefined, format: (value: T) => string): string =>
  value === null || value === undefined ? NO_VALUE : format(value);

/** Totals of the listed sessions, so they follow the search and filters. */
export function SessionsKpis({
  kpis,
  isLoading,
  formatters: { formatNumber, formatPercent },
}: {
  kpis: SessionListKpis | undefined;
  isLoading: boolean;
  formatters: Formatters;
}) {
  const total = kpis?.totalSessions;
  const shareOf = (count: number | undefined) =>
    total && count !== undefined
      ? i18n.translate('xpack.digitalExperience.sessions.kpis.shareLabel', {
          defaultMessage: '{share} of sessions',
          values: { share: formatPercent(count / total) },
        })
      : undefined;

  const items = [
    {
      id: 'total',
      title: withValue(total, formatNumber),
      description: i18n.translate('xpack.digitalExperience.sessions.kpis.totalLabel', {
        defaultMessage: 'Sessions',
      }),
    },
    {
      id: 'withJsErrors',
      title: withValue(kpis?.sessionsWithJsErrors, formatNumber),
      description: i18n.translate('xpack.digitalExperience.sessions.kpis.withJsErrorsLabel', {
        defaultMessage: 'Sessions with JS errors',
      }),
      subtitle: shareOf(kpis?.sessionsWithJsErrors),
    },
    {
      id: 'withFailedRequests',
      title: withValue(kpis?.sessionsWithFailedRequests, formatNumber),
      description: i18n.translate('xpack.digitalExperience.sessions.kpis.withFailedRequestsLabel', {
        defaultMessage: 'Sessions with failed requests',
      }),
      subtitle: shareOf(kpis?.sessionsWithFailedRequests),
    },
    {
      id: 'medianDuration',
      title: withValue(kpis?.medianDurationMs, formatSessionDuration),
      description: i18n.translate('xpack.digitalExperience.sessions.kpis.medianDurationLabel', {
        defaultMessage: 'Median duration',
      }),
    },
    {
      id: 'avgPageViews',
      // One decimal, in the Advanced Settings number format.
      title: withValue(kpis?.avgPageViews, (value) => formatNumber(Math.round(value * 10) / 10)),
      // Page views, not page loads: in-app navigations count too.
      description: i18n.translate('xpack.digitalExperience.sessions.kpis.avgPageViewsLabel', {
        defaultMessage: 'Page views per session',
      }),
    },
    {
      id: 'bounceRate',
      title: withValue(kpis?.bounceRate, formatPercent),
      description: i18n.translate('xpack.digitalExperience.sessions.kpis.bounceRateLabel', {
        defaultMessage: 'Bounce rate',
      }),
    },
  ];

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="digitalExperienceSessionsKpis">
      <EuiFlexGroup gutterSize="l" wrap responsive={false}>
        {items.map(({ id, title, description, subtitle }) => (
          <EuiFlexItem key={id} css={{ minWidth: 140 }}>
            <EuiStat
              data-test-subj={`digitalExperienceSessionsKpi-${id}`}
              title={title}
              description={description}
              titleSize="s"
              isLoading={isLoading && !kpis}
            >
              {subtitle}
            </EuiStat>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
