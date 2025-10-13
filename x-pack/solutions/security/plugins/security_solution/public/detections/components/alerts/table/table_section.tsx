/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import type { Filter } from '@kbn/es-query';
import { TableId } from '@kbn/securitysolution-data-table';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useGroupTakeActionsItems } from '../../../hooks/alerts_table/use_group_take_action_items';
import {
  defaultGroupingOptions,
  defaultGroupStatsAggregations,
  defaultGroupStatsRenderer,
  defaultGroupTitleRenderers,
} from '../../alerts_table/grouping_settings';
import type { AssigneesIdsSelection } from '../../../../common/components/assignees/types';
import { useDataTableFilters } from '../../../../common/hooks/use_data_table_filters';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { inputsSelectors } from '../../../../common/store/inputs';
import { useUserData } from '../../user_info';
import { useListsConfig } from '../../../containers/detection_engine/lists/use_lists_config';
import {
  buildAlertAssigneesFilter,
  buildShowBuildingBlockFilter,
  buildThreatMatchFilter,
} from '../../alerts_table/default_config';
import type { Status } from '../../../../../common/api/detection_engine';
import { GroupedAlertsTable } from '../../alerts_table/alerts_grouping';
import { AlertsTable } from '../../alerts_table';

export const TABLE_SECTION_TEST_ID = 'alerts-page-table-section';

export interface TableSectionProps {
  /**
   * The list of assignees to add to the others filters
   */
  assignees: AssigneesIdsSelection[];
  /**
   * DataView used to fetch the alerts data
   */
  dataView: DataView;
  /**
   * The page filters retrieved from the FiltersSection component to filter the table
   */
  pageFilters: Filter[] | undefined;
  /**
   * The status filter retrieved from the FiltersSection component to filter the table
   * This is an array of Status values, such as ['open', 'acknowledged', 'closed', 'in-progress']
   */
  statusFilter: Status[];
}

/**
 * Renders the alerts table with grouping functionality in the alerts page.
 */
export const TableSection = memo(
  ({ assignees, dataView, pageFilters, statusFilter }: TableSectionProps) => {
    const getGlobalFiltersQuerySelector = useMemo(
      () => inputsSelectors.globalFiltersQuerySelector(),
      []
    );
    const globalFilters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

    const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
    const query = useDeepEqualSelector(getGlobalQuerySelector);

    const { to, from } = useGlobalTime();

    const [{ loading: userInfoLoading, hasIndexWrite, hasIndexMaintenance }] = useUserData();

    const { loading: listsConfigLoading } = useListsConfig();

    const { showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts } = useDataTableFilters(
      TableId.alertsOnAlertsPage
    );

    const defaultFilters = useMemo(
      () => [
        ...buildShowBuildingBlockFilter(showBuildingBlockAlerts),
        ...buildThreatMatchFilter(showOnlyThreatIndicatorAlerts),
        ...(pageFilters ?? []),
        ...buildAlertAssigneesFilter(assignees),
      ],
      [assignees, showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts, pageFilters]
    );

    const isLoading = useMemo(
      () => userInfoLoading || listsConfigLoading || !Array.isArray(pageFilters),
      [pageFilters, listsConfigLoading, userInfoLoading]
    );

    const renderAlertTable = useCallback(
      (groupingFilters: Filter[]) => {
        return (
          <AlertsTable
            tableType={TableId.alertsOnAlertsPage}
            inputFilters={[...defaultFilters, ...groupingFilters]}
            isLoading={isLoading}
          />
        );
      },
      [defaultFilters, isLoading]
    );

    const groupTakeActionItems = useGroupTakeActionsItems({
      currentStatus: statusFilter,
      showAlertStatusActions: Boolean(hasIndexWrite) && Boolean(hasIndexMaintenance),
    });

    const accordionExtraActionGroupStats = useMemo(
      () => ({
        aggregations: defaultGroupStatsAggregations,
        renderer: defaultGroupStatsRenderer,
      }),
      []
    );

    return (
      <div data-test-subj={TABLE_SECTION_TEST_ID}>
        <GroupedAlertsTable
          accordionButtonContent={defaultGroupTitleRenderers}
          accordionExtraActionGroupStats={accordionExtraActionGroupStats}
          dataView={dataView}
          defaultFilters={defaultFilters}
          defaultGroupingOptions={defaultGroupingOptions}
          from={from}
          globalFilters={globalFilters}
          globalQuery={query}
          groupTakeActionItems={groupTakeActionItems}
          loading={isLoading}
          renderChildComponent={renderAlertTable}
          tableId={TableId.alertsOnAlertsPage}
          to={to}
        />
      </div>
    );
  }
);

TableSection.displayName = 'TableSection';
