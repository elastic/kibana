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
import { DriftTimelineSelector } from './drift_timeline';
import { SnapshotComparison } from './snapshot_comparison';
import * as i18n from '../pages/translations';

const DEFAULT_RANGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface DriftOverviewProps {
  hostId?: string;
}

export const DriftOverview: React.FC<DriftOverviewProps> = React.memo(({ hostId }) => {
  const [referenceTime] = useState(() => new Date());
  const [timeFrom, setTimeFrom] = useState<Date>(() => new Date(Date.now() - DEFAULT_RANGE_MS));
  const [timeTo, setTimeTo] = useState<Date>(() => new Date());
  const [selectedCategories, setSelectedCategories] = useState<DriftCategory[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<DriftSeverity[]>([]);
  const [selectedHostId, setSelectedHostId] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const effectiveHostId = hostId || selectedHostId;

  const { data: summaryData, loading: summaryLoading, error } = useDriftSummary({
    from: timeFrom,
    to: timeTo,
    histogramInterval: '30m',
    hostId: effectiveHostId,
  });

  const { data: eventsData, loading: eventsLoading, refresh } = useDriftEvents({
    from: timeFrom,
    to: timeTo,
    categories: selectedCategories,
    severities: selectedSeverities,
    hostId: effectiveHostId,
    page: page + 1,
    pageSize,
  });

  useEffect(() => {
    setPage(0);
  }, [timeFrom, timeTo, selectedCategories, selectedSeverities, effectiveHostId]);

  const handleTimelineChange = useCallback((from: Date, to: Date) => {
    setTimeFrom(from);
    setTimeTo(to);
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

  const hasError = error || !summaryData;
  const hasNoData = !hasError && summaryData?.total_events === 0;

  const {
    total_events = 0,
    events_by_category = { persistence: 0, privileges: 0, network: 0, software: 0, posture: 0 },
    events_by_severity = { critical: 0, high: 0, medium: 0, low: 0 },
    assets_with_changes = 0,
  } = summaryData ?? {};

  const totalCategoryEvents =
    events_by_category.persistence +
    events_by_category.privileges +
    events_by_category.network +
    events_by_category.software +
    events_by_category.posture;

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <DriftTimelineSelector
          referenceTime={referenceTime}
          initialStart={timeFrom}
          initialEnd={timeTo}
          histogramData={summaryData?.histogram}
          onRangeChange={handleTimelineChange}
          isLoading={summaryLoading}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <DriftFilters
          selectedCategories={selectedCategories}
          selectedSeverities={selectedSeverities}
          selectedHostId={selectedHostId}
          availableHosts={summaryData?.top_changed_assets ?? []}
          onCategoryChange={handleCategoryChange}
          onSeverityChange={handleSeverityChange}
          onHostChange={handleHostChange}
          onRefresh={handleRefresh}
          isLoadingHosts={summaryLoading}
          hideHostFilter={!!hostId}
        />
      </EuiFlexItem>

      {hasError && (
        <EuiFlexItem>
          <EuiPanel hasBorder>
            <EuiText color="danger">{i18n.DRIFT_ERROR_LOADING}</EuiText>
          </EuiPanel>
        </EuiFlexItem>
      )}

      {hasNoData && (
        <EuiFlexItem>
          <EuiEmptyPrompt
            iconType="checkInCircleFilled"
            iconColor="success"
            title={<h3>{i18n.DRIFT_NO_CHANGES}</h3>}
            body={
              <EuiText color="subdued">
                No configuration changes have been detected for the selected time range and filters.
              </EuiText>
            }
          />
        </EuiFlexItem>
      )}

      {!hasError && !hasNoData && (
        <>
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
                            max={totalCategoryEvents || 1}
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
                            max={totalCategoryEvents || 1}
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
                            max={totalCategoryEvents || 1}
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
                            max={totalCategoryEvents || 1}
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
                            max={totalCategoryEvents || 1}
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
        </>
      )}

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
        <SnapshotComparison hostId={hostId} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

DriftOverview.displayName = 'DriftOverview';
