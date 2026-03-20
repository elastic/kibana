/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type Dispatch, memo, type SetStateAction, useCallback, useMemo } from 'react';
import type { Filter, TimeRange } from '@kbn/es-query';
import type { FilterGroupHandler } from '@kbn/alerts-ui-shared';
import type { DataView } from '@kbn/data-views-plugin/common';
import { TableId } from '@kbn/securitysolution-data-table';
import { PageFilters } from './page_filters';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { inputsSelectors } from '../../../../common/store/inputs';
import { useDataTableFilters } from '../../../../common/hooks/use_data_table_filters';
import {
  buildShowBuildingBlockFilter,
  buildThreatMatchFilter,
} from '../../alerts_table/default_config';
import type { Status } from '../../../../../common/api/detection_engine';

export interface FiltersSectionProps {
  /**
   * Data view used for the alerts page
   */
  dataView: DataView;
  /**
   * Page filters for the alerts page
   */
  pageFilters: Filter[] | undefined;
  /**
   * Callback to set the page filter handler for the alerts page to allow a refresh after the table has reloaded
   */
  setPageFilterHandler: Dispatch<SetStateAction<FilterGroupHandler | undefined>>;
  /**
   * Callback to set the page filters for the alerts page as it's also used in the GroupedTable component
   */
  setPageFilters: Dispatch<SetStateAction<Filter[] | undefined>>;
  /**
   * Callback to set the status filter to the alerts page as it's also used in the GroupedTable component
   */
  setStatusFilter: Dispatch<SetStateAction<Status[]>>;
}

/**
 * UI section of the attacks page that renders the page filters
 */
export const FiltersSection = memo(
  ({
    dataView,
    pageFilters,
    setPageFilterHandler,
    setPageFilters,
    setStatusFilter,
  }: FiltersSectionProps) => {
    const getGlobalFiltersQuerySelector = useMemo(
      () => inputsSelectors.globalFiltersQuerySelector(),
      []
    );
    const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
    const query = useDeepEqualSelector(getGlobalQuerySelector);
    const topLevelFilters = useDeepEqualSelector(getGlobalFiltersQuerySelector);
    const { showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts } = useDataTableFilters(
      TableId.alertsOnAttacksPage
    );

    const filters = useMemo(() => {
      return [
        ...topLevelFilters,
        ...(pageFilters ?? []),
        ...buildShowBuildingBlockFilter(showBuildingBlockAlerts),
        ...buildThreatMatchFilter(showOnlyThreatIndicatorAlerts),
      ];
    }, [topLevelFilters, pageFilters, showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts]);

    const { to, from } = useGlobalTime();

    const onFilterControlsChange = useCallback(
      (newFilters: Filter[]) => {
        setPageFilters(newFilters);
        if (!newFilters.length) return;

        const newStatusFilter = newFilters.find(
          (filter) => filter.meta.key === 'kibana.alert.workflow_status'
        );
        if (newStatusFilter) {
          const status: Status[] = newStatusFilter.meta.params
            ? (newStatusFilter.meta.params as Status[])
            : [newStatusFilter.query?.match_phrase['kibana.alert.workflow_status']];
          setStatusFilter(status);
        } else {
          setStatusFilter([]);
        }
      },
      [setPageFilters, setStatusFilter]
    );

    const pageFiltersTimeRange = useMemo<TimeRange>(
      () => ({
        from,
        to,
        mode: 'absolute',
      }),
      [from, to]
    );

    return (
      <PageFilters
        filters={filters}
        onFiltersChange={onFilterControlsChange}
        query={query}
        timeRange={pageFiltersTimeRange}
        onInit={setPageFilterHandler}
        dataView={dataView}
      />
    );
  }
);

FiltersSection.displayName = 'FiltersSection';
