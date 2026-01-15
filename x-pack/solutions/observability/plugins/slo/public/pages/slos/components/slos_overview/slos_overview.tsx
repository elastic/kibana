/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useGetSettings } from '../../../slo_settings/hooks/use_get_settings';
import { useFetchSLOsOverview } from '../../hooks/use_fetch_slos_overview';
import { useUrlSearchState } from '../../hooks/use_url_search_state';
import { OverviewItem } from './overview_item';
import { SLOOverviewAlerts } from './slo_overview_alerts';

export function SLOsOverview() {
  const { state, onStateChange } = useUrlSearchState();
  const { kqlQuery, filters, tagsFilter, statusFilter, lastRefresh } = state;

  const { data: currentSettings, isLoading: isSettingsLoading } = useGetSettings();
  const { data, isLoading: isOverviewStatsLoading } = useFetchSLOsOverview({
    kqlQuery,
    filters,
    tagsFilter,
    statusFilter,
    lastRefresh,
  });

  const theme = useEuiTheme().euiTheme;

  const isLoading = isSettingsLoading || isOverviewStatsLoading;

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={2}>
        <EuiPanel hasShadow={false} hasBorder={true}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.slo.sLOsOverview.h3.overviewLabel', {
                defaultMessage: 'Overview',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="xl" justifyContent="spaceBetween">
            <OverviewItem
              title={data?.healthy?.total}
              description={i18n.translate('xpack.slo.sLOsOverview.euiStat.healthyLabel', {
                defaultMessage: 'Healthy',
              })}
              titleColor="success"
              isLoading={isLoading}
              onClick={() => onStateChange({ kqlQuery: `status : HEALTHY` })}
              tooltip={i18n.translate('xpack.slo.sLOsOverview.euiStat.healthyLabel.tooltip', {
                defaultMessage: 'Click to filter by healthy status',
              })}
              subtitle={
                data?.healthy?.stale && data.healthy.stale > 0
                  ? i18n.translate('xpack.slo.sLOsOverview.euiStat.staleSubtitle', {
                      defaultMessage: '{count} stale',
                      values: { count: data.healthy.stale },
                    })
                  : undefined
              }
              subtitleTooltip={i18n.translate(
                'xpack.slo.sLOsOverview.euiStat.healthyLabel.subtitleTooltip',
                { defaultMessage: 'Click to filter by healthy status and stale' }
              )}
              onSubtitleClick={() =>
                onStateChange({
                  kqlQuery: `status : "HEALTHY" and summaryUpdatedAt < "now-${currentSettings?.staleThresholdInHours}h"`,
                })
              }
            />
            <OverviewItem
              title={data?.violated?.total}
              description={i18n.translate('xpack.slo.sLOsOverview.euiStat.violatedLabel', {
                defaultMessage: 'Violated',
              })}
              titleColor="danger"
              onClick={() => onStateChange({ kqlQuery: `status : VIOLATED` })}
              isLoading={isLoading}
              tooltip={i18n.translate('xpack.slo.sLOsOverview.euiStat.violatedLabel.tooltip', {
                defaultMessage: 'Click to filter by violated status',
              })}
              subtitle={
                data?.violated?.stale && data.violated.stale > 0
                  ? i18n.translate('xpack.slo.sLOsOverview.euiStat.staleSubtitle', {
                      defaultMessage: '{count} stale',
                      values: { count: data.violated.stale },
                    })
                  : undefined
              }
              subtitleTooltip={i18n.translate(
                'xpack.slo.sLOsOverview.euiStat.violatedLabel.subtitleTooltip',
                { defaultMessage: 'Click to filter by violated status and stale' }
              )}
              onSubtitleClick={() =>
                onStateChange({
                  kqlQuery: `status : "VIOLATED" and summaryUpdatedAt < "now-${currentSettings?.staleThresholdInHours}h"`,
                })
              }
            />
            <OverviewItem
              title={data?.noData?.total}
              description={i18n.translate('xpack.slo.sLOsOverview.euiStat.noDataLabel', {
                defaultMessage: 'No data',
              })}
              titleColor="subdued"
              onClick={() => onStateChange({ kqlQuery: `status : NO_DATA` })}
              isLoading={isLoading}
              tooltip={i18n.translate('xpack.slo.sLOsOverview.euiStat.noDataLabel.tooltip', {
                defaultMessage: 'Click to filter by no data status',
              })}
              subtitle={
                data?.noData?.stale && data.noData.stale > 0
                  ? i18n.translate('xpack.slo.sLOsOverview.euiStat.staleSubtitle', {
                      defaultMessage: '{count} stale',
                      values: { count: data.noData.stale },
                    })
                  : undefined
              }
              subtitleTooltip={i18n.translate(
                'xpack.slo.sLOsOverview.euiStat.noDataLabel.subtitleTooltip',
                { defaultMessage: 'Click to filter by no data status and stale' }
              )}
              onSubtitleClick={() =>
                onStateChange({
                  kqlQuery: `status : "NO_DATA" and summaryUpdatedAt < "now-${currentSettings?.staleThresholdInHours}h"`,
                })
              }
            />
            <OverviewItem
              title={data?.degrading?.total}
              description={i18n.translate('xpack.slo.sLOsOverview.euiStat.degradingLabel', {
                defaultMessage: 'Degrading',
              })}
              onClick={() => onStateChange({ kqlQuery: `status : DEGRADING` })}
              isLoading={isLoading}
              tooltip={i18n.translate('xpack.slo.sLOsOverview.euiStat.degradingLabel.tooltip', {
                defaultMessage: 'Click to filter by degrading status',
              })}
              titleColor={theme.colors.textWarning}
              subtitle={
                data?.degrading?.stale && data.degrading.stale > 0
                  ? i18n.translate('xpack.slo.sLOsOverview.euiStat.staleSubtitle', {
                      defaultMessage: '{count} stale',
                      values: { count: data.degrading.stale },
                    })
                  : undefined
              }
              subtitleTooltip={i18n.translate(
                'xpack.slo.sLOsOverview.euiStat.degradingLabel.subtitleTooltip',
                { defaultMessage: 'Click to filter by no data status and stale' }
              )}
              onSubtitleClick={() =>
                onStateChange({
                  kqlQuery: `status : "DEGRADING" and summaryUpdatedAt < "now-${currentSettings?.staleThresholdInHours}h"`,
                })
              }
            />
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <SLOOverviewAlerts data={data} isLoading={isLoading} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
