/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiStat,
  EuiPanel,
  EuiIcon,
  EuiToolTip,
  EuiSkeletonRectangle,
  EuiBadge,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ErrorStats } from '../../../../../../common/runtime_types';

export const ErrorStatsPanel = ({
  stats,
  loading,
}: {
  stats: ErrorStats | null;
  loading: boolean;
}) => {
  const { euiTheme } = useEuiTheme();

  if (loading && !stats) {
    return (
      <EuiPanel hasBorder hasShadow={false}>
        <EuiFlexGroup gutterSize="l">
          {[1, 2, 3, 4].map((n) => (
            <EuiFlexItem key={n}>
              <EuiSkeletonRectangle width="100%" height="80px" />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  if (!stats) return null;

  const errorRatePct = (stats.errorRate * 100).toFixed(1);
  const avgDuration = formatDuration(stats.avgDurationMs);
  const deltaAbs = Math.abs(stats.errorRateDelta * 100).toFixed(1);
  const trendDirection =
    stats.errorRateDelta > 0.001 ? 'up' : stats.errorRateDelta < -0.001 ? 'down' : 'flat';

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiFlexGroup gutterSize="l" responsive wrap>
        <EuiFlexItem grow={1} style={{ minWidth: 140 }}>
          <EuiStat
            title={`${errorRatePct}%`}
            titleColor={
              stats.errorRate > 0.5 ? 'danger' : stats.errorRate > 0.1 ? 'warning' : 'default'
            }
            titleSize="m"
            description={ERROR_RATE_LABEL}
            reverse
          />
        </EuiFlexItem>

        <EuiFlexItem grow={1} style={{ minWidth: 140 }}>
          <EuiStat
            title={
              <span>
                {stats.affectedMonitors}
                <span style={{ fontSize: euiTheme.size.m, color: euiTheme.colors.subduedText }}>
                  {' / '}
                  {stats.totalMonitors}
                </span>
              </span>
            }
            titleColor={stats.affectedMonitors > 0 ? 'danger' : 'default'}
            titleSize="m"
            description={AFFECTED_MONITORS_LABEL}
            reverse
          />
        </EuiFlexItem>

        <EuiFlexItem grow={1} style={{ minWidth: 140 }}>
          <EuiStat title={avgDuration} titleSize="m" description={AVG_DURATION_LABEL} reverse />
        </EuiFlexItem>

        <EuiFlexItem grow={1} style={{ minWidth: 140 }}>
          <EuiStat
            title={<TrendIndicator direction={trendDirection} delta={deltaAbs} />}
            titleSize="m"
            description={TREND_LABEL}
            reverse
          />
        </EuiFlexItem>

        {stats.locationStats.length > 1 && (
          <EuiFlexItem grow={2} style={{ minWidth: 200 }}>
            <EuiStat
              title={<LocationBadges locations={stats.locationStats} />}
              titleSize="xxs"
              description={LOCATION_BREAKDOWN_LABEL}
              reverse
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const MAX_VISIBLE_LOCATIONS = 4;

const LocationBadges = ({
  locations,
}: {
  locations: Array<{ location: string; count: number }>;
}) => {
  const sorted = [...locations].sort((a, b) => b.count - a.count);
  const visible = sorted.slice(0, MAX_VISIBLE_LOCATIONS);
  const overflow = sorted.slice(MAX_VISIBLE_LOCATIONS);

  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
      {visible.map((loc) => (
        <EuiFlexItem key={loc.location} grow={false}>
          <EuiToolTip content={`${loc.count} ${ERRORS_IN_LABEL} ${loc.location}`}>
            <EuiBadge color={loc.count === 0 ? 'success' : 'danger'}>
              {loc.location}: {loc.count}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      ))}
      {overflow.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={overflow.map((loc) => `${loc.location}: ${loc.count}`).join(', ')}>
            <EuiBadge color="hollow">
              +{overflow.length}{' '}
              {i18n.translate('xpack.synthetics.locationBadges.moreBadgeLabel', {
                defaultMessage: 'more',
              })}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const TrendIndicator = ({
  direction,
  delta,
}: {
  direction: 'up' | 'down' | 'flat';
  delta: string;
}) => {
  if (direction === 'flat') {
    return (
      <span>
        <EuiIcon type="minus" aria-hidden={true} /> {STABLE_LABEL}
      </span>
    );
  }

  const isUp = direction === 'up';
  return (
    <span style={{ color: isUp ? '#BD271E' : '#017D73' }}>
      <EuiIcon
        type={isUp ? 'sortUp' : 'sortDown'}
        color={isUp ? 'danger' : 'success'}
        aria-hidden={true}
      />{' '}
      {isUp ? '+' : '-'}
      {delta}%
    </span>
  );
};

function formatDuration(ms: number): string {
  if (ms == null || isNaN(ms)) return '--';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

const ERROR_RATE_LABEL = i18n.translate('xpack.synthetics.errorStats.errorRate', {
  defaultMessage: 'Error rate',
});

const AFFECTED_MONITORS_LABEL = i18n.translate('xpack.synthetics.errorStats.affectedMonitors', {
  defaultMessage: 'Affected monitors',
});

const AVG_DURATION_LABEL = i18n.translate('xpack.synthetics.errorStats.avgDuration', {
  defaultMessage: 'Avg error duration',
});

const TREND_LABEL = i18n.translate('xpack.synthetics.errorStats.trend', {
  defaultMessage: 'Trend vs prev period',
});

const STABLE_LABEL = i18n.translate('xpack.synthetics.errorStats.stable', {
  defaultMessage: 'Stable',
});

const LOCATION_BREAKDOWN_LABEL = i18n.translate('xpack.synthetics.errorStats.locationBreakdown', {
  defaultMessage: 'Errors by location',
});

const ERRORS_IN_LABEL = i18n.translate('xpack.synthetics.errorStats.errorsIn', {
  defaultMessage: 'errors in',
});
