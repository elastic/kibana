/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSpacer } from '@elastic/eui';
import { ShowAllSpaces } from '../../common/show_all_spaces';
import type { OverviewStatusMetaData } from '../../../../../../../common/runtime_types';
import { SYNTHETICS_MONITORS_EMBEDDABLE } from '../../../../../embeddables/constants';
import { AddToDashboard } from '../../../common/components/add_to_dashboard';
import { useOverviewStatus } from '../../hooks/use_overview_status';
import { GroupFields } from './grid_by_group/group_fields';
import type { OverviewView } from '../../../../state/overview';
import { setFlyoutConfig } from '../../../../state/overview';
import { useMonitorsSortedByStatus } from '../../../../hooks/use_monitors_sorted_by_status';
import { refreshOverviewTrends } from '../../../../state/overview';
import { OverviewPaginationInfo } from './overview_pagination_info';
import { SortFields } from './sort_fields';
import { NoMonitorsFound } from '../../common/no_monitors_found';
import { useSyntheticsRefreshContext } from '../../../../contexts';
import type { FlyoutParamProps } from './types';
import { MaybeMonitorDetailsFlyout } from './monitor_detail_flyout';
import { OverviewGridCompactView } from './compact_view/overview_grid_compact_view';
import { ViewButtons } from './view_buttons/view_buttons';
import { OverviewCardView } from './overview_cards_view/overview_card_view';

export const OverviewGrid = memo(
  ({ view, isEmbeddable }: { view: OverviewView; isEmbeddable?: boolean }) => {
    const dispatch = useDispatch();

    const {
      status,
      loaded: isInitialized,
      loading,
    } = useOverviewStatus({
      scopeStatusByLocation: true,
    });
    const monitorsSortedByStatus: OverviewStatusMetaData[] = useMonitorsSortedByStatus();

    const setFlyoutConfigCallback = useCallback(
      (params: FlyoutParamProps) => dispatch(setFlyoutConfig(params)),
      [dispatch]
    );
    const { lastRefresh } = useSyntheticsRefreshContext();

    useEffect(() => {
      dispatch(refreshOverviewTrends.get());
    }, [dispatch, lastRefresh]);

    // Display no monitors found when down, up, or disabled filter produces no results
    if (status && !monitorsSortedByStatus.length && isInitialized) {
      return <NoMonitorsFound />;
    }

    return (
      <>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          responsive={false}
          wrap={true}
        >
          <EuiFlexItem grow={true}>
            <OverviewPaginationInfo total={status ? monitorsSortedByStatus.length : undefined} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ShowAllSpaces />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <AddToDashboard type={SYNTHETICS_MONITORS_EMBEDDABLE} asButton />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <SortFields />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <GroupFields />
          </EuiFlexItem>
          {!isEmbeddable ? (
            <EuiFlexItem grow={false}>
              <ViewButtons />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        {loading && isInitialized ? (
          <>
            <EuiProgress size="xs" color="accent" />
            <EuiSpacer
              css={{
                blockSize: 14,
              }}
            />
          </>
        ) : (
          <EuiSpacer size="m" />
        )}
        {view === 'cardView' ? (
          <OverviewCardView
            monitorsSortedByStatus={monitorsSortedByStatus}
            setFlyoutConfigCallback={setFlyoutConfigCallback}
          />
        ) : view === 'compactView' ? (
          <OverviewGridCompactView setFlyoutConfigCallback={setFlyoutConfigCallback} />
        ) : null}
        <MaybeMonitorDetailsFlyout setFlyoutConfigCallback={setFlyoutConfigCallback} />
      </>
    );
  }
);
