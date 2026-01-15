/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
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
  EuiEmptyPrompt,
} from '@elastic/eui';
import type { DriftCategory, DriftSeverity } from '../../../common/endpoint_assets';
import { useDriftSummary } from '../hooks/use_drift_summary';
import { useDriftEvents } from '../hooks/use_drift_events';
import { DriftEventsTable } from './drift_events_table';
import { DriftFilters } from './drift_filters';
import { SnapshotComparison } from './snapshot_comparison';
import * as i18n from '../pages/translations';

export const DriftOverview: React.FC = React.memo(() => {
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedCategories, setSelectedCategories] = useState<DriftCategory[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<DriftSeverity[]>([]);
  const [selectedHostId, setSelectedHostId] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { data: summaryData, loading: summaryLoading, error } = useDriftSummary({ timeRange });
  const { data: eventsData, loading: eventsLoading, refresh } = useDriftEvents({
    timeRange,
    categories: selectedCategories,
    severities: selectedSeverities,
    hostId: selectedHostId,
    page: page + 1,
    pageSize,
  });

  useEffect(() => {
    setPage(0);
  }, [timeRange, selectedCategories, selectedSeverities, selectedHostId]);

  const handleTimeRangeChange = useCallback((newTimeRange: string) => {
    setTimeRange(newTimeRange);
  }, []);

  const handleCategoryChange = useCallback((categories: DriftCategory[]) => {
    setSelectedCategories(categories);
  }, []);

  const handleSeverityChange = useCallback((severities: DriftSeverity[]) => {
    setSelectedSeverities(severities);
  }, []);

  const handleHostChange = useCallback((hostId: string) => {
    setSelectedHostId(hostId);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0);
  }, []);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const loading = summaryLoading;

  if (loading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (error || !summaryData) {
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
  } = summaryData;

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

  const totalCategoryEvents =
    events_by_category.persistence +
    events_by_category.privileges +
    events_by_category.network +
    events_by_category.software +
    events_by_category.posture;

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <DriftFilters
          selectedCategories={selectedCategories}
          selectedSeverities={selectedSeverities}
          selectedTimeRange={timeRange}
          selectedHostId={selectedHostId}
          availableHosts={summaryData?.top_changed_assets ?? []}
          onCategoryChange={handleCategoryChange}
          onSeverityChange={handleSeverityChange}
          onTimeRangeChange={handleTimeRangeChange}
          onHostChange={handleHostChange}
          onRefresh={handleRefresh}
          isLoadingHosts={summaryLoading}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={total_events}
                description={i18n.DRIFT_EVENTS_24H}
                titleSize="l"
                titleColor={
                  total_events > 50 ? 'danger' : total_events > 20 ? 'warning' : 'default'
                }
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

              <DriftEventsTable
                events={eventsData?.events ?? []}
                loading={eventsLoading}
                pagination={{
                  pageIndex: page,
                  pageSize,
                  totalItemCount: eventsData?.total ?? 0,
                }}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Historical Snapshot Comparison Section */}
      <EuiFlexItem>
        <EuiSpacer size="xl" />
        <EuiTitle size="m">
          <h2>{i18n.SNAPSHOT_COMPARISON_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s">
          {i18n.SNAPSHOT_COMPARISON_DESCRIPTION}
        </EuiText>
        <EuiSpacer size="m" />
        <SnapshotComparison />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

DriftOverview.displayName = 'DriftOverview';
