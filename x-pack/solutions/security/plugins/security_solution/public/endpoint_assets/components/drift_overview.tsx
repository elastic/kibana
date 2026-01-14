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
  EuiPanel,
  EuiTitle,
  EuiStat,
  EuiSpacer,
  EuiProgress,
  EuiText,
  EuiLoadingSpinner,
  EuiBasicTable,
  EuiHealth,
  EuiEmptyPrompt,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { useDriftSummary } from '../hooks/use_drift_summary';
import type { DriftEvent } from '../../../common/endpoint_assets';
import * as i18n from '../pages/translations';

interface RecentChangeRow {
  timestamp: string;
  host_name: string;
  category: string;
  change: string;
  severity: string;
}

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    default:
      return 'success';
  }
};

const getCategoryLabel = (category: string): string => {
  switch (category) {
    case 'persistence':
      return i18n.DRIFT_CATEGORY_PERSISTENCE;
    case 'privileges':
      return i18n.DRIFT_CATEGORY_PRIVILEGES;
    case 'network':
      return i18n.DRIFT_CATEGORY_NETWORK;
    case 'software':
      return i18n.DRIFT_CATEGORY_SOFTWARE;
    case 'posture':
      return i18n.DRIFT_CATEGORY_POSTURE;
    default:
      return category;
  }
};

export const DriftOverview: React.FC = React.memo(() => {
  const { data, loading, error } = useDriftSummary({ timeRange: '24h' });

  if (loading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (error || !data) {
    return (
      <EuiPanel hasBorder>
        <EuiText color="danger">{i18n.DRIFT_ERROR_LOADING}</EuiText>
      </EuiPanel>
    );
  }

  const {
    total_events,
    events_by_category,
    events_by_severity,
    assets_with_changes,
    recent_changes,
  } = data;

  if (total_events === 0) {
    return (
      <EuiEmptyPrompt
        iconType="checkInCircleFilled"
        iconColor="success"
        title={<h3>{i18n.DRIFT_NO_CHANGES}</h3>}
        body={
          <EuiText color="subdued">
            No configuration changes have been detected across your fleet in the last 24 hours.
          </EuiText>
        }
      />
    );
  }

  const recentChanges: RecentChangeRow[] = (recent_changes ?? []).map((change) => ({
    timestamp: change.timestamp,
    host_name: change.host_name,
    category: change.category,
    change: `${change.action}: ${change.item_name}`,
    severity: change.severity,
  }));

  const columns: Array<EuiBasicTableColumn<RecentChangeRow>> = [
    {
      field: 'timestamp',
      name: i18n.DRIFT_COLUMN_TIME,
      width: '150px',
      render: (timestamp: string) => new Date(timestamp).toLocaleTimeString(),
    },
    {
      field: 'host_name',
      name: i18n.DRIFT_COLUMN_HOST,
    },
    {
      field: 'category',
      name: i18n.DRIFT_COLUMN_CATEGORY,
      render: (category: string) => getCategoryLabel(category),
    },
    {
      field: 'change',
      name: i18n.DRIFT_COLUMN_CHANGE,
    },
    {
      field: 'severity',
      name: i18n.DRIFT_COLUMN_SEVERITY,
      width: '100px',
      render: (severity: string) => (
        <EuiHealth color={getSeverityColor(severity)}>
          {severity.toUpperCase()}
        </EuiHealth>
      ),
    },
  ];

  const totalCategoryEvents =
    events_by_category.persistence +
    events_by_category.privileges +
    events_by_category.network +
    events_by_category.software +
    events_by_category.posture;

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={total_events}
                description={i18n.DRIFT_EVENTS_24H}
                titleSize="l"
                titleColor={total_events > 50 ? 'danger' : total_events > 20 ? 'warning' : 'default'}
              />
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={events_by_severity.critical}
                description={i18n.DRIFT_CRITICAL}
                titleSize="l"
                titleColor={events_by_severity.critical > 0 ? 'danger' : 'success'}
              />
              <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued">
                {events_by_severity.high} {i18n.DRIFT_HIGH.toLowerCase()}
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={events_by_severity.high}
                description={i18n.DRIFT_HIGH}
                titleSize="l"
                titleColor={events_by_severity.high > 0 ? 'warning' : 'default'}
              />
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={assets_with_changes}
                description={i18n.DRIFT_ASSETS_CHANGED}
                titleSize="l"
                titleColor="default"
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem grow={1}>
            <EuiPanel hasBorder>
              <EuiTitle size="xs">
                <h3>{i18n.DRIFT_EVENTS_BY_CATEGORY}</h3>
              </EuiTitle>
              <EuiSpacer size="m" />

              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem grow={false} style={{ width: 100 }}>
                      <EuiText size="s">{i18n.DRIFT_CATEGORY_PERSISTENCE}</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiProgress
                        value={events_by_category.persistence}
                        max={totalCategoryEvents}
                        color="danger"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} style={{ width: 40 }}>
                      <EuiText size="s">{events_by_category.persistence}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem grow={false} style={{ width: 100 }}>
                      <EuiText size="s">{i18n.DRIFT_CATEGORY_PRIVILEGES}</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiProgress
                        value={events_by_category.privileges}
                        max={totalCategoryEvents}
                        color="warning"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} style={{ width: 40 }}>
                      <EuiText size="s">{events_by_category.privileges}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem grow={false} style={{ width: 100 }}>
                      <EuiText size="s">{i18n.DRIFT_CATEGORY_NETWORK}</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiProgress
                        value={events_by_category.network}
                        max={totalCategoryEvents}
                        color="primary"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} style={{ width: 40 }}>
                      <EuiText size="s">{events_by_category.network}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem grow={false} style={{ width: 100 }}>
                      <EuiText size="s">{i18n.DRIFT_CATEGORY_SOFTWARE}</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiProgress
                        value={events_by_category.software}
                        max={totalCategoryEvents}
                        color="primary"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} style={{ width: 40 }}>
                      <EuiText size="s">{events_by_category.software}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem grow={false} style={{ width: 100 }}>
                      <EuiText size="s">{i18n.DRIFT_CATEGORY_POSTURE}</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiProgress
                        value={events_by_category.posture}
                        max={totalCategoryEvents}
                        color="danger"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} style={{ width: 40 }}>
                      <EuiText size="s">{events_by_category.posture}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem grow={2}>
            <EuiPanel hasBorder>
              <EuiTitle size="xs">
                <h3>{i18n.DRIFT_RECENT_CHANGES}</h3>
              </EuiTitle>
              <EuiSpacer size="m" />

              <EuiBasicTable<RecentChangeRow>
                items={recentChanges}
                columns={columns}
                compressed
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

DriftOverview.displayName = 'DriftOverview';
