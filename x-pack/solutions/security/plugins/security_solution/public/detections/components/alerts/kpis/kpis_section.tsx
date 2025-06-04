/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type { Filter } from '@kbn/es-query';
import { TableId } from '@kbn/securitysolution-data-table';
import type { RunTimeMappings } from '@kbn/timelines-plugin/common/search_strategy';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { AssigneesIdsSelection } from '../../../../common/components/assignees/types';
import { useDataTableFilters } from '../../../../common/hooks/use_data_table_filters';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import type { UpdateDateRange } from '../../../../common/components/charts/common';
import { inputsSelectors } from '../../../../common/store/inputs';
import { setAbsoluteRangeDatePicker } from '../../../../common/store/inputs/actions';
import { useUserData } from '../../user_info';
import {
  buildAlertAssigneesFilter,
  buildShowBuildingBlockFilter,
  buildThreatMatchFilter,
} from '../../alerts_table/default_config';
import { ChartPanels } from '../../alerts_kpis/chart_panels';
import { useKibana } from '../../../../common/lib/kibana';
import type { AddFilterProps } from '../../alerts_kpis/common/types';

export interface ChartsSectionProps {
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
  detectionPageFilters: Filter[] | undefined;
}

/**
 *
 */
export const KPIsSection = memo(
  ({ assignees, dataViewSpec, detectionPageFilters }: ChartsSectionProps) => {
    const dispatch = useDispatch();

    const { data } = useKibana().services;
    const { filterManager } = data.query;
    const addFilter = useCallback(
      ({ field, value, negate }: AddFilterProps) => {
        filterManager.addFilters([
          {
            meta: {
              alias: null,
              disabled: false,
              negate: negate ?? false,
            },
            ...(value != null
              ? { query: { match_phrase: { [field]: value } } }
              : { exists: { field } }),
          },
        ]);
      },
      [filterManager]
    );

    const getGlobalFiltersQuerySelector = useMemo(
      () => inputsSelectors.globalFiltersQuerySelector(),
      []
    );
    const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);
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
    const alertsDefaultFilters = useMemo(
      () => [...topLevelFilters, ...(detectionPageFilters ?? [])],
      [topLevelFilters, detectionPageFilters]
    );

    const pageFiltersIsLoading = useMemo(
      () => !Array.isArray(detectionPageFilters),
      [detectionPageFilters]
    );

    const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
    const query = useDeepEqualSelector(getGlobalQuerySelector);

    const runTimeMappings = useMemo(
      () => dataViewSpec.runtimeFieldMap as RunTimeMappings,
      [dataViewSpec]
    );

    const [{ signalIndexName }] = useUserData();

    const updateDateRangeCallback = useCallback<UpdateDateRange>(
      ({ x }) => {
        if (!x) {
          return;
        }
        const [min, max] = x;
        dispatch(
          setAbsoluteRangeDatePicker({
            id: InputsModelId.global,
            from: new Date(min).toISOString(),
            to: new Date(max).toISOString(),
          })
        );
      },
      [dispatch]
    );

    return (
      <ChartPanels
        addFilter={addFilter}
        alertsDefaultFilters={alertsDefaultFilters}
        isLoadingIndexPattern={pageFiltersIsLoading}
        query={query}
        runtimeMappings={runTimeMappings}
        signalIndexName={signalIndexName}
        updateDateRangeCallback={updateDateRangeCallback}
      />
    );
  }
);

KPIsSection.displayName = 'KPIsSection';
