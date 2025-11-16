/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { Filter } from '@kbn/es-query';
import { TableId } from '@kbn/securitysolution-data-table';
import type { DataView } from '@kbn/data-views-plugin/common';
import { PageScope } from '../../../../data_view_manager/constants';
import { useGroupTakeActionsItems } from '../../../hooks/alerts_table/use_group_take_action_items';
import {
  defaultGroupingOptions,
  defaultGroupStatsAggregations,
  defaultGroupStatsRenderer,
  defaultGroupTitleRenderers,
} from '../../alerts_table/grouping_settings';
import { useDataTableFilters } from '../../../../common/hooks/use_data_table_filters';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { inputsSelectors } from '../../../../common/store/inputs';
import { useUserData } from '../../user_info';
import { useListsConfig } from '../../../containers/detection_engine/lists/use_lists_config';
import {
  buildShowBuildingBlockFilter,
  buildThreatMatchFilter,
} from '../../alerts_table/default_config';
import { GroupedAlertsTable } from '../../alerts_table/alerts_grouping';
import { AlertsTable } from '../../alerts_table';

export const TABLE_SECTION_TEST_ID = 'attacks-page-table-section';

export interface TableSectionProps {
  /**
   * DataView used to fetch the alerts data
   */
  dataView: DataView;
}

/**
 * Renders the alerts table with grouping functionality in the attacks page.
 */
export const TableSection = React.memo(({ dataView }: TableSectionProps) => {
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

  // AlertsTable manages global filters itself, so not including `filters`
  const defaultFilters = useMemo(
    () => [
      ...buildShowBuildingBlockFilter(showBuildingBlockAlerts),
      ...buildThreatMatchFilter(showOnlyThreatIndicatorAlerts),
    ],
    [showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts]
  );

  const isLoading = useMemo(
    () => userInfoLoading || listsConfigLoading,
    [listsConfigLoading, userInfoLoading]
  );

  const renderAlertTable = useCallback(
    (groupingFilters: Filter[]) => {
      return (
        <AlertsTable
          tableType={TableId.alertsOnAlertsPage}
          inputFilters={[...defaultFilters, ...groupingFilters]}
          isLoading={isLoading}
          sourcererScope={PageScope.attacks}
        />
      );
    },
    [defaultFilters, isLoading]
  );

  const groupTakeActionItems = useGroupTakeActionsItems({
    showAlertStatusActions: Boolean(hasIndexWrite) && Boolean(hasIndexMaintenance),
  });

  const accordionExtraActionGroupStats = useMemo(
    () => ({
      aggregations: defaultGroupStatsAggregations,
      renderer: defaultGroupStatsRenderer,
    }),
    []
  );

  const dataViewSpec = useMemo(() => {
    return dataView.toSpec(true);
  }, [dataView]);

  return (
    <div data-test-subj={TABLE_SECTION_TEST_ID}>
      <GroupedAlertsTable
        accordionButtonContent={defaultGroupTitleRenderers}
        accordionExtraActionGroupStats={accordionExtraActionGroupStats}
        dataView={dataView}
        dataViewSpec={dataViewSpec}
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
        sourcererScope={PageScope.attacks}
      />
    </div>
  );
});
TableSection.displayName = 'TableSection';
