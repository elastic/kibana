/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { Subject } from 'rxjs';
import { useDispatch } from 'react-redux';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { areFiltersEmpty } from '../common/utils';
import { getStatsOverviewStore } from './redux_store';
import { ShowSelectedFilters } from '../common/show_selected_filters';
import { MonitorFilters } from '../monitors_overview/types';
import { setOverviewPageStateAction } from '../../synthetics/state';
import { SyntheticsEmbeddableContext } from '../synthetics_embeddable_context';
import { OverviewStatus } from '../../synthetics/components/monitors_page/overview/overview/overview_status';

export const StatsOverviewComponent = ({
  reload$,
  filters,
}: {
  reload$: Subject<boolean>;
  filters: MonitorFilters;
}) => {
  const statsOverviewStore = useRef(getStatsOverviewStore());

  return (
    <SyntheticsEmbeddableContext reload$={reload$} reduxStore={statsOverviewStore.current}>
      <EuiFlexGroup
        alignItems="center"
        css={{
          height: '100%',
        }}
      >
        <EuiFlexItem>
          <WithFiltersComponent filters={filters ?? {}} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </SyntheticsEmbeddableContext>
  );
};

const WithFiltersComponent = ({ filters }: { filters: MonitorFilters }) => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(
      setOverviewPageStateAction({
        tags: filters.tags?.map((tag) => tag.value),
        locations: filters.locations?.map((location) => location.value),
        monitorTypes: filters.monitorTypes?.map((monitorType) => monitorType.value),
        monitorQueryIds: filters.monitorIds?.map((monitorId) => monitorId.value),
        projects: filters.projects?.map((project) => project.value),
      })
    );
  }, [dispatch, filters]);

  const hasFilters = !areFiltersEmpty(filters);

  return (
    <OverviewStatus
      titleAppend={hasFilters ? <ShowSelectedFilters filters={filters ?? {}} /> : null}
      hideTitle={true}
    />
  );
};
