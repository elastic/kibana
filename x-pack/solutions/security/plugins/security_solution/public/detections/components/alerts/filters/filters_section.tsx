/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type Dispatch, memo, type SetStateAction, useCallback, useMemo } from 'react';
import type { Filter, TimeRange } from '@kbn/es-query';
import { TableId } from '@kbn/securitysolution-data-table';
import type { FilterGroupHandler } from '@kbn/alerts-ui-shared';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { PageFilters } from './page_filters';
import type { AssigneesIdsSelection } from '../../../../common/components/assignees/types';
import { useDataTableFilters } from '../../../../common/hooks/use_data_table_filters';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { inputsSelectors } from '../../../../common/store/inputs';
import {
  buildAlertAssigneesFilter,
  buildShowBuildingBlockFilter,
  buildThreatMatchFilter,
} from '../../alerts_table/default_config';
import type { Status } from '../../../../../common/api/detection_engine';

export interface FiltersSectionProps {
  /**
   *
   */
  assignees: AssigneesIdsSelection[];
  /**
   *
   */
  dataViewSpec: DataViewSpec;
  /**
   *
   */
  setStatusFilter: Dispatch<SetStateAction<Status[]>>;
  /**
   *
   */
  setDetectionPageFilters: Dispatch<SetStateAction<Filter[] | undefined>>;
  /**
   *
   */
  setDetectionPageFilterHandler: Dispatch<SetStateAction<FilterGroupHandler | undefined>>;
}

/**
 *
 */
export const FiltersSection = memo(
  ({
    assignees,
    dataViewSpec,
    setStatusFilter,
    setDetectionPageFilters,
    setDetectionPageFilterHandler,
  }: FiltersSectionProps) => {
    const getGlobalFiltersQuerySelector = useMemo(
      () => inputsSelectors.globalFiltersQuerySelector(),
      []
    );
    const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
    const query = useDeepEqualSelector(getGlobalQuerySelector);
    const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

    const { to, from } = useGlobalTime();

    const { showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts } = useDataTableFilters(
      TableId.alertsOnAlertsPage
    );

    const topLevelFilters = useMemo(() => {
      return [
        ...filters,
        ...buildShowBuildingBlockFilter(showBuildingBlockAlerts),
        ...buildThreatMatchFilter(showOnlyThreatIndicatorAlerts),
        ...buildAlertAssigneesFilter(assignees),
      ];
    }, [assignees, showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts, filters]);

    const onFilterControlsChange = useCallback(
      (newFilters: Filter[]) => {
        setDetectionPageFilters(newFilters);
        if (newFilters.length) {
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
        }
      },
      [setDetectionPageFilters, setStatusFilter]
    );

    const pageFiltersTimerange = useMemo<TimeRange>(
      () => ({
        from,
        to,
        mode: 'absolute',
      }),
      [from, to]
    );

    return (
      <PageFilters
        filters={topLevelFilters}
        onFiltersChange={onFilterControlsChange}
        query={query}
        timeRange={pageFiltersTimerange}
        onInit={setDetectionPageFilterHandler}
        dataViewSpec={dataViewSpec}
      />
    );
  }
);

FiltersSection.displayName = 'FiltersSection';
