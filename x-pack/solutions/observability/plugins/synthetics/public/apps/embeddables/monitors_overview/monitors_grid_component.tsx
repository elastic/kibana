/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Subject } from 'rxjs';
import { useDispatch, useSelector } from 'react-redux';
import { OverviewStatusMetaData } from '../../../../common/runtime_types';
import { areFiltersEmpty } from '../common/utils';
import { getOverviewStore } from './redux_store';
import { ShowSelectedFilters } from '../common/show_selected_filters';
import {
  selectOverviewTrends,
  setFlyoutConfig,
  setOverviewPageStateAction,
  trendStatsBatch,
} from '../../synthetics/state';
import { MonitorFilters } from './types';
import { EmbeddablePanelWrapper } from '../../synthetics/components/common/components/embeddable_panel_wrapper';
import { SyntheticsEmbeddableContext } from '../synthetics_embeddable_context';
import { OverviewGrid } from '../../synthetics/components/monitors_page/overview/overview/overview_grid';
import { useMonitorsSortedByStatus } from '../../synthetics/hooks/use_monitors_sorted_by_status';
import { MetricItem } from '../../synthetics/components/monitors_page/overview/overview/metric_item/metric_item';
import { FlyoutParamProps } from '../../synthetics/components/monitors_page/overview/overview/types';
import { MaybeMonitorDetailsFlyout } from '../../synthetics/components/monitors_page/overview/overview/monitor_detail_flyout';

export const StatusGridComponent = ({
  reload$,
  filters,
}: {
  reload$: Subject<boolean>;
  filters: MonitorFilters;
}) => {
  const overviewStore = useRef(getOverviewStore());

  const hasFilters = !areFiltersEmpty(filters);

  return (
    <EmbeddablePanelWrapper
      titleAppend={hasFilters ? <ShowSelectedFilters filters={filters ?? {}} /> : null}
    >
      <SyntheticsEmbeddableContext reload$={reload$} reduxStore={overviewStore.current}>
        <MonitorsOverviewList filters={filters} />
      </SyntheticsEmbeddableContext>
    </EmbeddablePanelWrapper>
  );
};

const SingleMonitorView = ({ monitor }: { monitor: OverviewStatusMetaData }) => {
  const trendData = useSelector(selectOverviewTrends);
  const dispatch = useDispatch();

  const setFlyoutConfigCallback = useCallback(
    (params: FlyoutParamProps) => {
      dispatch(setFlyoutConfig(params));
    },
    [dispatch]
  );

  useEffect(() => {
    if (!trendData[monitor.configId + monitor.locationId]) {
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

  return (
    <>
      <MetricItem monitor={monitor} onClick={setFlyoutConfigCallback} />
      <MaybeMonitorDetailsFlyout setFlyoutConfigCallback={setFlyoutConfigCallback} />
    </>
  );
};

const MonitorsOverviewList = ({ filters }: { filters: MonitorFilters }) => {
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

  const monitorsSortedByStatus: OverviewStatusMetaData[] = useMonitorsSortedByStatus();

  return monitorsSortedByStatus.length === 1 ? (
    <SingleMonitorView monitor={monitorsSortedByStatus[0]} />
  ) : (
    <OverviewGrid />
  );
};
