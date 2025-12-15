/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { Filter } from '@kbn/es-query';
import { TableId } from '@kbn/securitysolution-data-table';
import type { DataView } from '@kbn/data-views-plugin/common';
import { isGroupingBucket } from '@kbn/grouping/src';
import type { ParsedGroupingAggregation } from '@kbn/grouping/src';
import { ALERT_ATTACK_IDS } from '../../../../../common/field_maps/field_names';
import { PageScope } from '../../../../data_view_manager/constants';
import { useGroupTakeActionsItems } from '../../../hooks/alerts_table/use_group_take_action_items';
import {
  defaultGroupingOptions,
  defaultGroupStatsAggregations,
  defaultGroupStatsRenderer,
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
import type { AlertsGroupingAggregation } from '../../alerts_table/grouping_settings/types';
import { useGetDefaultGroupTitleRenderers } from '../../../hooks/attacks/use_get_default_group_title_renderers';

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
    TableId.alertsOnAttacksPage
  );

  const [attackIds, setAttackIds] = useState<string[] | undefined>(undefined);
  const { defaultGroupTitleRenderers } = useGetDefaultGroupTitleRenderers({ attackIds });

  const onAggregationsChange = useCallback(
    (aggs: ParsedGroupingAggregation<AlertsGroupingAggregation>, groupingLevel?: number) => {
      if (groupingLevel != null && groupingLevel !== 0) {
        return;
      }
      const attackIdsGroupBuckets = aggs.groupByFields?.buckets?.filter(
        (bucket) =>
          isGroupingBucket(bucket) &&
          !bucket.isNullGroup &&
          bucket.selectedGroup === ALERT_ATTACK_IDS
      );
      const groupKeys = attackIdsGroupBuckets?.flatMap(({ key }) => key);
      setAttackIds(groupKeys);
    },
    []
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
          tableType={TableId.alertsOnAttacksPage}
          inputFilters={[...defaultFilters, ...groupingFilters]}
          isLoading={isLoading}
          pageScope={PageScope.alerts} // show only detection alerts
          disableAdditionalToolbarControls={groupingFilters.length > 0}
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
        tableId={TableId.alertsOnAttacksPage}
        to={to}
        onAggregationsChange={onAggregationsChange}
        pageScope={PageScope.attacks} // allow filtering and grouping by attack fields
      />
    </div>
  );
});
TableSection.displayName = 'TableSection';
