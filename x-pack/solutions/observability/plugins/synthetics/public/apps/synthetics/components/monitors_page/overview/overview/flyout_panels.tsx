/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageSection,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { RECORDS_FIELD } from '@kbn/exploratory-view-plugin/public';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { Ping } from '../../../../../../../common/runtime_types';
import { useSyntheticsSettingsContext } from '../../../../contexts';
import type { ClientPluginsStart } from '../../../../../../plugin';
import { parseBadgeStatus, StatusBadge } from '../../../common/monitor_test_result/status_badge';
import { getErrorDetailsUrl } from '../../../monitor_details/monitor_errors/errors_list';
import { useDateFormat } from '../../../../../../hooks/use_date_format';
import { useMonitorSummaryStats } from '../../../../hooks/use_monitor_summary_stats';

interface FlyoutQueryFilters {
  monitorQueryId: string;
  locationLabel: string;
  locationId: string;
}

const MONITOR_STATUS_RULE = {
  'kibana.alert.rule.category': ['Synthetics monitor status'],
};

const buildFilters = ({ monitorQueryId, locationLabel, locationId }: FlyoutQueryFilters) => ({
  queryIdFilter: { 'monitor.id': [monitorQueryId] },
  locationFilter: [
    {
      field: 'observer.geo.name',
      values: [locationLabel, locationId],
    },
  ],
});

export const FlyoutLastTestRun = ({
  latestPing,
  loading,
  configId,
  locationId,
}: {
  latestPing?: Ping;
  loading: boolean;
  configId: string;
  locationId: string;
}) => {
  const { euiTheme } = useEuiTheme();
  const { basePath } = useSyntheticsSettingsContext();
  const formatter = useDateFormat();

  const TitleNode = (
    <EuiTitle size="xs">
      <h3>{LAST_TEST_RUN_LABEL}</h3>
    </EuiTitle>
  );

  if (loading && !latestPing) {
    return (
      <EuiPageSection bottomBorder="extended">
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>{TitleNode}</EuiFlexItem>
          <EuiFlexItem>
            <EuiSkeletonRectangle width="52px" height="20px" />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiSkeletonText lines={1} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageSection>
    );
  }

  if (!latestPing) {
    return (
      <EuiPageSection bottomBorder="extended">
        {TitleNode}
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {WAITING_FOR_FIRST_RUN_LABEL}
        </EuiText>
      </EuiPageSection>
    );
  }

  const isDown = (latestPing.summary?.down ?? 0) > 0;
  const lastRunTimestamp = formatter(latestPing['@timestamp']);

  return (
    <EuiPageSection bottomBorder="extended">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={false}>{TitleNode}</EuiFlexItem>
        <EuiFlexItem grow={false} css={{ flexBasis: 'fit-content' }}>
          <StatusBadge status={parseBadgeStatus(isDown ? 'fail' : 'success')} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color={euiTheme.colors.darkShade} css={{ whiteSpace: 'nowrap' }}>
            {lastRunTimestamp}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {latestPing.error ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            data-test-subj="flyoutLastTestRunErrorCallout"
            title={latestPing.error.message}
            size="s"
            color="danger"
            iconType="warning"
            css={{
              borderRadius: euiTheme.border.radius.medium,
              fontWeight: euiTheme.font.weight.semiBold,
            }}
          >
            {latestPing.state?.id && (
              <EuiButton
                data-test-subj="flyoutViewErrorDetails"
                color="danger"
                size="s"
                href={getErrorDetailsUrl({
                  basePath,
                  configId,
                  locationId,
                  stateId: latestPing.state.id,
                })}
              >
                {VIEW_ERROR_DETAILS_LABEL}
              </EuiButton>
            )}
          </EuiCallOut>
        </>
      ) : null}
    </EuiPageSection>
  );
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`;
  return `${(ms / 60000).toFixed(1)} min`;
};

export const FlyoutSummaryKPIs = ({
  monitorId,
  locationLabel,
  from,
  to,
  dateLabel,
}: {
  monitorId: string;
  locationLabel: string;
  from: string;
  to: string;
  dateLabel: string;
}) => {
  const { data, loading } = useMonitorSummaryStats({
    monitorId,
    locationLabel,
    from,
    to,
  });

  const availabilityColor =
    data && data.availability < 99
      ? 'danger'
      : data && data.availability < 99.9
      ? 'warning'
      : 'success';

  return (
    <EuiPageSection bottomBorder="extended">
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{SUMMARY_LABEL}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color="subdued" size="s">
            {dateLabel}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiStat
            title={data ? `${data.availability.toFixed(2)}%` : '--'}
            description={AVAILABILITY_LABEL}
            titleSize="s"
            titleColor={availabilityColor}
            isLoading={loading}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={data ? formatDuration(data.medianDuration) : '--'}
            description={DURATION_LABEL}
            titleSize="s"
            isLoading={loading}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={data ? String(data.errorCount) : '--'}
            description={ERRORS_LABEL}
            titleSize="s"
            titleColor={data && data.errorCount > 0 ? 'danger' : 'default'}
            isLoading={loading}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageSection>
  );
};

export const FlyoutAlerts = ({
  filters,
  from,
  to,
}: {
  filters: FlyoutQueryFilters;
  from: string;
  to: string;
}) => {
  const {
    services: {
      exploratoryView: { ExploratoryViewEmbeddable },
    },
  } = useKibana<ClientPluginsStart>();
  const { euiTheme } = useEuiTheme();

  const { queryIdFilter, locationFilter } = buildFilters(filters);

  return (
    <EuiPageSection bottomBorder="extended">
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              {ALERTS_LABEL} (
              <span style={{ display: 'inline-block' }}>
                <ExploratoryViewEmbeddable
                  noLabel
                  fontSize={16}
                  lineHeight={27}
                  withActions={false}
                  customHeight="27px"
                  reportType="single-metric"
                  attributes={[
                    {
                      dataType: 'alerts',
                      time: { from, to },
                      name: 'All',
                      selectedMetricField: RECORDS_FIELD,
                      reportDefinitions: {
                        ...MONITOR_STATUS_RULE,
                        ...queryIdFilter,
                      },
                      filters: locationFilter,
                    },
                  ]}
                />
              </span>
              )
            </h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="s">
            <EuiText size="xs" color="subdued">
              {ACTIVE_LABEL}
            </EuiText>
            <ExploratoryViewEmbeddable
              dataTestSubj="flyoutActiveAlertsCount"
              customHeight="36px"
              reportType="single-metric"
              attributes={[
                {
                  dataType: 'alerts',
                  time: { from, to },
                  name: ACTIVE_LABEL,
                  selectedMetricField: RECORDS_FIELD,
                  reportDefinitions: {
                    ...MONITOR_STATUS_RULE,
                    ...queryIdFilter,
                  },
                  filters: [
                    { field: 'kibana.alert.status', values: ['active'] },
                    ...locationFilter,
                  ],
                },
              ]}
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="s">
            <EuiText size="xs" color="subdued">
              {RECOVERED_LABEL}
            </EuiText>
            <ExploratoryViewEmbeddable
              customHeight="36px"
              reportType="single-metric"
              attributes={[
                {
                  dataType: 'alerts',
                  time: { from, to },
                  name: RECOVERED_LABEL,
                  selectedMetricField: RECORDS_FIELD,
                  reportDefinitions: {
                    ...MONITOR_STATUS_RULE,
                    ...queryIdFilter,
                  },
                  filters: [
                    { field: 'kibana.alert.status', values: ['recovered'] },
                    ...locationFilter,
                  ],
                },
              ]}
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="s">
            <EuiText size="xs" color="subdued">
              {ACTIVE_LABEL}
            </EuiText>
            <ExploratoryViewEmbeddable
              sparklineMode
              customHeight="36px"
              reportType="kpi-over-time"
              attributes={[
                {
                  seriesType: 'area',
                  time: { from, to },
                  reportDefinitions: {
                    ...MONITOR_STATUS_RULE,
                    ...queryIdFilter,
                  },
                  dataType: 'alerts',
                  selectedMetricField: RECORDS_FIELD,
                  name: ACTIVE_LABEL,
                  filters: [
                    { field: 'kibana.alert.status', values: ['active'] },
                    ...locationFilter,
                  ],
                  color: euiTheme.colors.vis.euiColorVis7,
                },
              ]}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageSection>
  );
};

const LAST_TEST_RUN_LABEL = i18n.translate('xpack.synthetics.flyout.lastTestRunTitle', {
  defaultMessage: 'Last test run',
});

const VIEW_ERROR_DETAILS_LABEL = i18n.translate('xpack.synthetics.flyout.viewErrorDetails', {
  defaultMessage: 'View error details',
});

const SUMMARY_LABEL = i18n.translate('xpack.synthetics.flyout.summaryLabel', {
  defaultMessage: 'Summary',
});

const AVAILABILITY_LABEL = i18n.translate('xpack.synthetics.flyout.availabilityLabel', {
  defaultMessage: 'Availability',
});

const DURATION_LABEL = i18n.translate('xpack.synthetics.flyout.durationLabel', {
  defaultMessage: 'Duration (median)',
});

const ERRORS_LABEL = i18n.translate('xpack.synthetics.flyout.errorsLabel', {
  defaultMessage: 'Errors',
});

const ALERTS_LABEL = i18n.translate('xpack.synthetics.flyout.alertsLabel', {
  defaultMessage: 'Alerts',
});

const ACTIVE_LABEL = i18n.translate('xpack.synthetics.flyout.alerts.active', {
  defaultMessage: 'Active',
});

const RECOVERED_LABEL = i18n.translate('xpack.synthetics.flyout.alerts.recovered', {
  defaultMessage: 'Recovered',
});

const WAITING_FOR_FIRST_RUN_LABEL = i18n.translate('xpack.synthetics.flyout.waitingForFirstRun', {
  defaultMessage: 'Monitor is waiting for its first test run or may be stalled.',
});
