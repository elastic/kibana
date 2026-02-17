/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiSwitch } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { TableId } from '@kbn/securitysolution-data-table';
import type { DataView } from '@kbn/data-views-plugin/common';
import { isGroupingBucket } from '@kbn/grouping/src';
import type { GroupingSort, ParsedGroupingAggregation, RawBucket } from '@kbn/grouping/src';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';

import { AttackDetailsRightPanelKey } from '../../../../flyout/attack_details/constants/panel_keys';
import { ALERT_ATTACK_IDS } from '../../../../../common/field_maps/field_names';
import { PageScope } from '../../../../data_view_manager/constants';
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
import type { AlertsGroupingAggregation } from '../../alerts_table/grouping_settings/types';
import { useGetDefaultGroupTitleRenderers } from '../../../hooks/attacks/use_get_default_group_title_renderers';
import { useAttackGroupHandler } from '../../../hooks/attacks/use_attack_group_handler';
import type { AssigneesIdsSelection } from '../../../../common/components/assignees/types';

import { AttackDetailsContainer } from './attack_details/attack_details_container';
import { AlertsTab } from './attack_details/alerts_tab';
import { EmptyResultsPrompt } from './empty_results_prompt';
import { groupingOptions, groupingSettings } from './grouping_settings/grouping_configs';
import * as i18n from './translations';
import { buildConnectorIdFilter } from './filtering_configs';
import type { GroupTakeActionItems } from '../../alerts_table/types';
import { AttacksGroupTakeActionItems } from './attacks_group_take_action_items';
import { useGroupStats } from './grouping_settings/use_group_stats';
import { AttacksTableSortSelect, DEFAULT_ATTACKS_SORT } from './attacks_table_sort_select';
import { AlertActionItems } from './alerts_action_items';

export const TABLE_SECTION_TEST_ID = 'attacks-page-table-section';

export interface TableSectionProps {
  /**
   * DataView used to fetch the alerts data
   */
  dataView: DataView;

  /**
   * The status filter retrieved from the FiltersSection component to filter the table
   * This is an array of Status values, such as ['open', 'acknowledged', 'closed', 'in-progress']
   */
  statusFilter: Status[];

  /**
   * The page filters retrieved from the FiltersSection component to filter the table
   */
  pageFilters: Filter[] | undefined;

  /**
   * The list of assignees to add to the others filters
   */
  assignees: AssigneesIdsSelection[];
  /**
   * The list of selected connectors ID to filter the table
   */
  selectedConnectorNames: string[];

  /**
   * Callback to open the schedules flyout
   */
  openSchedulesFlyout: () => void;
}

/**
 * Renders the alerts table with grouping functionality in the attacks page.
 */
export const TableSection = React.memo(
  ({
    dataView,
    statusFilter,
    pageFilters,
    assignees,
    selectedConnectorNames,
    openSchedulesFlyout,
  }: TableSectionProps) => {
    const getGlobalFiltersQuerySelector = useMemo(
      () => inputsSelectors.globalFiltersQuerySelector(),
      []
    );
    const globalFilters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

    const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
    const query = useDeepEqualSelector(getGlobalQuerySelector);

    const { to, from } = useGlobalTime();

    const [{ loading: userInfoLoading }] = useUserData();

    const { loading: listsConfigLoading } = useListsConfig();

    const { showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts } = useDataTableFilters(
      TableId.alertsOnAttacksPage
    );

    // for showing / hiding anonymized data:
    const [showAnonymized, setShowAnonymized] = useState<boolean>(false);
    const onToggleShowAnonymized = useCallback(() => setShowAnonymized((current) => !current), []);
    const showAnonymizedSwitch = useMemo(() => {
      return (
        <EuiSwitch
          key="show-anonymized-switch"
          checked={showAnonymized}
          compressed={true}
          data-test-subj={`${TABLE_SECTION_TEST_ID}-show-anonymized`}
          label={i18n.SHOW_ANONYMIZED_LABEL}
          onChange={onToggleShowAnonymized}
        />
      );
    }, [onToggleShowAnonymized, showAnonymized]);

    const [attackIds, setAttackIds] = useState<string[] | undefined>(undefined);
    const { getAttack, isLoading: isAttacksLoading } = useAttackGroupHandler({ attackIds });

    const { openFlyout } = useExpandableFlyoutApi();
    const openAttackDetailsFlyout = useCallback(
      (selectedGroup: string, bucket: RawBucket<AlertsGroupingAggregation>) => {
        const attack = getAttack(selectedGroup, bucket);
        if (attack) {
          openFlyout({
            right: {
              id: AttackDetailsRightPanelKey,
              params: {
                attackId: attack.id,
                indexName: dataView.getIndexPattern(),
              },
            },
          });
        }
      },
      [dataView, getAttack, openFlyout]
    );

    const { defaultGroupTitleRenderers } = useGetDefaultGroupTitleRenderers({
      getAttack,
      showAnonymized,
      isLoading: isAttacksLoading,
      openAttackDetailsFlyout,
    });

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
        ...(pageFilters ?? []),
        ...buildAlertAssigneesFilter(assignees),
        ...buildConnectorIdFilter(selectedConnectorNames),
      ],
      [
        showBuildingBlockAlerts,
        showOnlyThreatIndicatorAlerts,
        pageFilters,
        assignees,
        selectedConnectorNames,
      ]
    );

    const isLoading = useMemo(
      () => userInfoLoading || listsConfigLoading || !Array.isArray(pageFilters),
      [listsConfigLoading, userInfoLoading, pageFilters]
    );

    const renderChildComponent = useCallback(
      (
        groupingFilters: Filter[],
        selectedGroup?: string,
        fieldBucket?: RawBucket<AlertsGroupingAggregation>
      ) => {
        // attack is undefined for the generic group marked as `-` which means this is the group of alerts that do not belong to any attack.
        const attack =
          selectedGroup && fieldBucket ? getAttack(selectedGroup, fieldBucket) : undefined;

        if (!attack) {
          return (
            <AlertsTab
              groupingFilters={groupingFilters}
              defaultFilters={defaultFilters}
              isTableLoading={isLoading}
            />
          );
        }

        const filteredAlertsCount = fieldBucket?.attackRelatedAlerts?.doc_count ?? 0;

        return (
          <AttackDetailsContainer
            attack={attack}
            showAnonymized={showAnonymized}
            groupingFilters={groupingFilters}
            defaultFilters={defaultFilters}
            isTableLoading={isLoading}
            filteredAlertsCount={filteredAlertsCount}
          />
        );
      },
      [defaultFilters, getAttack, isLoading, showAnonymized]
    );

    const groupTakeActionItems: GroupTakeActionItems = useCallback(
      (props) => {
        const attack = getAttack(props.selectedGroup, props.groupBucket);
        if (!attack) return <AlertActionItems statusFilter={statusFilter} {...props} />;
        return <AttacksGroupTakeActionItems attack={attack} />;
      },
      [getAttack, statusFilter]
    );

    const accordionExtraActionGroupStats = useGroupStats();

    const dataViewSpec = useMemo(() => {
      return dataView.toSpec(true);
    }, [dataView]);

    const emptyGroupingComponent = useMemo(
      () => <EmptyResultsPrompt openSchedulesFlyout={openSchedulesFlyout} />,
      [openSchedulesFlyout]
    );

    const [sort, setSort] = useState<GroupingSort>(DEFAULT_ATTACKS_SORT);

    const attacksTableSortSelect = useMemo(
      () => (
        <EuiFlexGroup
          key={`${TABLE_SECTION_TEST_ID}-sort-select`}
          gutterSize="s"
          alignItems="center"
        >
          <EuiSpacer />
          <EuiFlexItem>
            <AttacksTableSortSelect sort={sort} onChange={setSort} />
          </EuiFlexItem>
          <EuiSpacer />
        </EuiFlexGroup>
      ),
      [sort]
    );

    return (
      <div data-test-subj={TABLE_SECTION_TEST_ID}>
        <GroupedAlertsTable
          accordionButtonContent={defaultGroupTitleRenderers}
          accordionExtraActionGroupStats={accordionExtraActionGroupStats}
          dataView={dataView}
          dataViewSpec={dataViewSpec}
          defaultFilters={defaultFilters}
          defaultGroupingOptions={groupingOptions}
          from={from}
          globalFilters={globalFilters}
          globalQuery={query}
          groupTakeActionItems={groupTakeActionItems}
          loading={isLoading}
          renderChildComponent={renderChildComponent}
          tableId={TableId.alertsOnAttacksPage}
          to={to}
          onAggregationsChange={onAggregationsChange}
          additionalToolbarControls={[showAnonymizedSwitch, attacksTableSortSelect]}
          pageScope={PageScope.attacks} // allow filtering and grouping by attack fields
          settings={groupingSettings}
          emptyGroupingComponent={emptyGroupingComponent}
          sort={sort}
        />
      </div>
    );
  }
);
TableSection.displayName = 'TableSection';
