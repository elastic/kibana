/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { Subject } from 'rxjs';
import { useDispatch } from 'react-redux';
import { areFiltersEmpty } from '../common/utils';
import { getOverviewStore } from './redux_store';
import { ShowSelectedFilters } from '../common/show_selected_filters';
import { setOverviewPageStateAction } from '../../synthetics/state';
import { MonitorFilters } from './types';
import { EmbeddablePanelWrapper } from '../../synthetics/components/common/components/embeddable_panel_wrapper';
import { SyntheticsEmbeddableContext } from '../synthetics_embeddable_context';
import { OverviewGrid } from '../../synthetics/components/monitors_page/overview/overview/overview_grid';

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

  return <OverviewGrid />;
};
