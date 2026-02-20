/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import type { Subject } from 'rxjs';
import { useDispatch, useSelector } from 'react-redux';
import { areFiltersEmpty } from '../common/utils';
import { getOverviewStore } from './redux_store';
import { ShowSelectedFilters } from '../common/show_selected_filters';
import type { OverviewView } from '../../synthetics/state';
import {
  selectOverviewTrends,
  setFlyoutConfig,
  setOverviewPageStateAction,
  trendStatsBatch,
} from '../../synthetics/state';
import { EmbeddablePanelWrapper } from '../../synthetics/components/common/components/embeddable_panel_wrapper';
import { SyntheticsEmbeddableContext } from '../synthetics_embeddable_context';
import { OverviewGrid } from '../../synthetics/components/monitors_page/overview/overview/overview_grid';
import { useMonitorsSortedByStatus } from '../../synthetics/hooks/use_monitors_sorted_by_status';
import { MetricItem } from '../../synthetics/components/monitors_page/overview/overview/metric_item/metric_item';
import type { FlyoutParamProps } from '../../synthetics/components/monitors_page/overview/overview/types';
import { MaybeMonitorDetailsFlyout } from '../../synthetics/components/monitors_page/overview/overview/monitor_detail_flyout';
import { useOverviewStatus } from '../../synthetics/components/monitors_page/hooks/use_overview_status';
import { OverviewLoader } from '../../synthetics/components/monitors_page/overview/overview/overview_loader';
import type { MonitorFilters } from '../../../../common/embeddables/stats_overview/types';

export const StatusGridComponent = ({
  reload$,
  filters,
  view,
}: {
  reload$: Subject<boolean>;
  filters: MonitorFilters;
  view: OverviewView;
}) => {
  const overviewStore = useRef(getOverviewStore());

  const hasFilters = !areFiltersEmpty(filters);
  const singleMonitor =
    filters && filters.locations.length === 1 && filters.monitorIds.length === 1;

  const monitorOverviewListComponent = (
    <SyntheticsEmbeddableContext reload$={reload$} reduxStore={overviewStore.current}>
      <MonitorsOverviewList filters={filters} singleMonitor={singleMonitor} view={view} />
    </SyntheticsEmbeddableContext>
  );

  return singleMonitor ? (
    monitorOverviewListComponent
  ) : (
    <EmbeddablePanelWrapper
      titleAppend={hasFilters ? <ShowSelectedFilters filters={filters ?? {}} /> : null}
    >
      {monitorOverviewListComponent}
    </EmbeddablePanelWrapper>
  );
};

const SingleMonitorView = () => {
  const trendData = useSelector(selectOverviewTrends);
  const dispatch = useDispatch();

  const setFlyoutConfigCallback = useCallback(
    (params: FlyoutParamProps) => {
      dispatch(setFlyoutConfig(params));
    },
    [dispatch]
  );

  const { loaded } = useOverviewStatus({
    scopeStatusByLocation: true,
  });
  const monitorsSortedByStatus = useMonitorsSortedByStatus();

  if (loaded && monitorsSortedByStatus.length !== 1) {
    throw new Error(
      'One and only one monitor should always be returned by useMonitorsSortedByStatus in this component, this should never happen'
    );
  }

  const monitor = monitorsSortedByStatus.length === 1 ? monitorsSortedByStatus[0] : undefined;

  useEffect(() => {
    if (monitor && !trendData[monitor.configId + monitor.locationId]) {
      dispatch(
        trendStatsBatch.get([
          {
            configId: monitor.configId,
            locationId: monitor.locationId,
            schedule: monitor.schedule,
          },
        ])
      );
    }
  }, [dispatch, monitor, trendData]);

  const style = { height: '100%', overflow: 'hidden' };

  if (!monitor) return <OverviewLoader rows={1} columns={1} style={style} />;

  return (
    <>
      <MetricItem monitor={monitor} onClick={setFlyoutConfigCallback} style={style} />
      <MaybeMonitorDetailsFlyout setFlyoutConfigCallback={setFlyoutConfigCallback} />
    </>
  );
};

const MonitorsOverviewList = ({
  filters,
  singleMonitor,
  view,
}: {
  filters: MonitorFilters;
  singleMonitor?: boolean;
  view: OverviewView;
}) => {
  const dispatch = useDispatch();
  useEffect(() => {
    if (!filters) return;
    dispatch(
      setOverviewPageStateAction({
        tags: filters.tags.map((tag) => tag.value),
        locations: filters.locations.map((location) => location.value),
        monitorTypes: filters.monitorTypes.map((monitorType) => monitorType.value),
        monitorQueryIds: filters.monitorIds.map((monitorId) => monitorId.value),
        projects: filters.projects.map((project) => project.value),
      })
    );
  }, [dispatch, filters]);

  if (singleMonitor && view === 'cardView') {
    return <SingleMonitorView />;
  }

  return <OverviewGrid view={view} isEmbeddable />;
};
