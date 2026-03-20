/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStat,
  EuiHealth,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiButton,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiHorizontalRule,
  EuiBadge,
} from '@elastic/eui';
import { usePipelineHealth, usePipelineMetrics } from '../../hooks/pipeline/use_pipeline_api';

const HEALTH_COLORS: Record<string, string> = {
  healthy: 'success',
  degraded: 'warning',
  unhealthy: 'danger',
};

const STATUS_COLORS: Record<string, string> = {
  success: 'success',
  partial: 'warning',
  failed: 'danger',
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

const formatTimestamp = (ts: string | null): string => {
  if (!ts) return 'Never';
  const date = new Date(ts);
  return date.toLocaleString();
};

export const PipelineDashboard: React.FC = () => {
  const { health, loading: healthLoading, error: healthError, fetchHealth } = usePipelineHealth();
  const {
    metrics,
    loading: metricsLoading,
    error: metricsError,
    fetchMetrics,
  } = usePipelineMetrics();

  useEffect(() => {
    fetchHealth();
    fetchMetrics();
  }, [fetchHealth, fetchMetrics]);

  const handleRefresh = useCallback(() => {
    fetchHealth();
    fetchMetrics();
  }, [fetchHealth, fetchMetrics]);

  const loading = healthLoading || metricsLoading;
  const error = healthError || metricsError;

  const successRate = useMemo(() => {
    if (!metrics || metrics.totalRuns === 0) return null;
    return ((metrics.successfulRuns / metrics.totalRuns) * 100).toFixed(1);
  }, [metrics]);

  if (loading && !health && !metrics) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiPanel paddingSize="l">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2>{'Alert Investigation Pipeline'}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={handleRefresh} isLoading={loading} iconType="refresh" size="s">
            {'Refresh'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {error && (
        <>
          <EuiCallOut title="Error fetching pipeline data" color="danger" iconType="alert">
            <p>{error}</p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      {health && (
        <EuiPanel color="subdued" paddingSize="m">
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiHealth color={HEALTH_COLORS[health.status] ?? 'subdued'}>
                <EuiText size="s">
                  <strong>{health.status.toUpperCase()}</strong>
                </EuiText>
              </EuiHealth>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                {health.reason}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      )}

      <EuiSpacer size="l" />

      {metrics && (
        <>
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              <EuiStat title={metrics.totalRuns} description="Total Runs" titleSize="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={successRate != null ? `${successRate}%` : 'N/A'}
                description="Success Rate"
                titleSize="m"
                titleColor={
                  successRate != null && Number(successRate) >= 90
                    ? 'success'
                    : successRate != null && Number(successRate) >= 70
                    ? 'default'
                    : 'danger'
                }
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={formatDuration(metrics.averageRunDurationMs)}
                description="Avg Duration"
                titleSize="m"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={metrics.consecutiveFailures}
                description="Consecutive Failures"
                titleSize="m"
                titleColor={metrics.consecutiveFailures >= 2 ? 'danger' : 'default'}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiHorizontalRule margin="l" />

          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              <EuiStat
                title={metrics.totalAlertsProcessed}
                description="Alerts Processed"
                titleSize="s"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={metrics.totalCasesMatched}
                description="Cases Matched"
                titleSize="s"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={metrics.totalCasesCreated}
                description="Cases Created"
                titleSize="s"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={metrics.totalAlertsAttached}
                description="Alerts Attached"
                titleSize="s"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat title={metrics.totalAdTriggered} description="AD Triggered" titleSize="s" />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiHorizontalRule margin="l" />

          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {'Last run:'}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">{formatTimestamp(metrics.lastRunAt)}</EuiText>
            </EuiFlexItem>
            {metrics.lastRunStatus && (
              <EuiFlexItem grow={false}>
                <EuiBadge color={STATUS_COLORS[metrics.lastRunStatus] ?? 'default'}>
                  {metrics.lastRunStatus}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      )}
    </EuiPanel>
  );
};
