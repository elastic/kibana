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
  EuiText,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiIcon,
} from '@elastic/eui';
import { useAvailableSnapshots } from '../../hooks/use_available_snapshots';
import { useSnapshotCompare } from '../../hooks/use_snapshot_compare';
import { DateSelector } from './date_selector';
import { ViewModeToggle, type ViewMode } from './view_mode_toggle';
import { ComparisonTable } from './comparison_table';

export const SnapshotComparison: React.FC = React.memo(() => {
  const [dateA, setDateA] = useState<string | null>(null);
  const [dateB, setDateB] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('changes_only');

  const { snapshots, loading: snapshotsLoading, error: snapshotsError } = useAvailableSnapshots();
  const { data, loading: compareLoading, error: compareError } = useSnapshotCompare({
    dateA,
    dateB,
    showOnlyChanges: viewMode === 'changes_only',
  });

  // Auto-select most recent two dates on load
  useEffect(() => {
    if (snapshots.length >= 2 && !dateA && !dateB) {
      setDateA(snapshots[1].date); // Second most recent
      setDateB(snapshots[0].date); // Most recent
    } else if (snapshots.length === 1 && !dateB) {
      setDateB(snapshots[0].date); // Most recent
    }
  }, [snapshots, dateA, dateB]);

  const handleDateAChange = useCallback((date: string | null) => {
    setDateA(date);
  }, []);

  const handleDateBChange = useCallback((date: string | null) => {
    setDateB(date);
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  // Loading state for snapshots
  if (snapshotsLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // Error state
  if (snapshotsError) {
    return (
      <EuiPanel hasBorder>
        <EuiText color="danger">Error loading snapshots: {snapshotsError.message}</EuiText>
      </EuiPanel>
    );
  }

  // No snapshots available
  if (snapshots.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="clock"
        title={<h3>No Snapshots Available</h3>}
        body={
          <EuiText color="subdued">
            Entity Store snapshots are created daily. Please wait for the snapshot task to run, or
            ensure the Entity Store is enabled and configured.
          </EuiText>
        }
      />
    );
  }

  // Not enough snapshots for comparison
  if (snapshots.length === 1) {
    return (
      <EuiEmptyPrompt
        iconType="clock"
        title={<h3>Only One Snapshot Available</h3>}
        body={
          <EuiText color="subdued">
            Snapshot comparison requires at least two snapshots. The next snapshot will be created
            at 00:01 UTC.
          </EuiText>
        }
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      {/* Header: Date selectors + View toggle */}
      <EuiFlexItem>
        <EuiFlexGroup alignItems="flexEnd" wrap responsive>
          <EuiFlexItem grow={false}>
            <DateSelector
              label="Compare From"
              availableDates={snapshots}
              selectedDate={dateA}
              onChange={handleDateAChange}
              isLoading={snapshotsLoading}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type="arrowRight" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DateSelector
              label="Compare To"
              availableDates={snapshots}
              selectedDate={dateB}
              onChange={handleDateBChange}
              isLoading={snapshotsLoading}
            />
          </EuiFlexItem>
          <EuiFlexItem grow />
          <EuiFlexItem grow={false}>
            <ViewModeToggle viewMode={viewMode} onChange={handleViewModeChange} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Summary stats */}
      {data && (
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              <EuiPanel hasBorder paddingSize="m">
                <EuiStat
                  title={data.total_assets}
                  description="Total Assets"
                  titleSize="s"
                  titleColor="default"
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel hasBorder paddingSize="m">
                <EuiStat
                  title={data.assets_with_changes}
                  description="Changed"
                  titleSize="s"
                  titleColor={data.assets_with_changes > 0 ? 'warning' : 'default'}
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel hasBorder paddingSize="m">
                <EuiStat
                  title={data.assets_added}
                  description="Added"
                  titleSize="s"
                  titleColor={data.assets_added > 0 ? 'success' : 'default'}
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel hasBorder paddingSize="m">
                <EuiStat
                  title={data.assets_removed}
                  description="Removed"
                  titleSize="s"
                  titleColor={data.assets_removed > 0 ? 'danger' : 'default'}
                />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}

      {/* Error message */}
      {compareError && (
        <EuiFlexItem>
          <EuiPanel hasBorder color="danger">
            <EuiText color="danger">Error comparing snapshots: {compareError.message}</EuiText>
          </EuiPanel>
        </EuiFlexItem>
      )}

      {/* Comparison table */}
      <EuiFlexItem>
        <EuiPanel hasBorder>
          <EuiTitle size="xs">
            <h3>Asset Comparison</h3>
          </EuiTitle>
          <EuiSpacer size="m" />

          {dateA && dateB ? (
            <ComparisonTable
              comparisons={data?.comparisons ?? []}
              viewMode={viewMode}
              dateA={dateA}
              dateB={dateB}
              loading={compareLoading}
            />
          ) : (
            <EuiText color="subdued" textAlign="center">
              Select two dates to compare snapshots
            </EuiText>
          )}
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

SnapshotComparison.displayName = 'SnapshotComparison';
