/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type { ViewSelection } from '@kbn/securitysolution-data-table';
import {
  dataTableActions,
  dataTableSelectors,
  tableDefaults,
  TableId,
} from '@kbn/securitysolution-data-table';
import { useGetGroupSelectorStateless } from '@kbn/grouping/src/hooks/use_get_group_selector';
import { getTelemetryEvent } from '@kbn/grouping/src/telemetry/const';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SummaryViewSelector } from '../../../common/components/events_viewer/summary_view_select';
import { groupIdSelector } from '../../../common/store/grouping/selectors';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { updateGroups } from '../../../common/store/grouping/actions';
import { useKibana } from '../../../common/lib/kibana';
import { AlertsEventTypes, METRIC_TYPE, track } from '../../../common/lib/telemetry';
import { useDataTableFilters } from '../../../common/hooks/use_data_table_filters';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { AdditionalFiltersAction } from '../../components/alerts_table/additional_filters_action';

const { changeViewMode } = dataTableActions;

export const getPersistentControlsHook = (tableId: TableId) => {
  const usePersistentControls = () => {
    const dispatch = useDispatch();
    const {
      services: { telemetry },
    } = useKibana();

    const { sourcererDataView } = useSourcererDataView(SourcererScopeName.detections);
    const groupId = useMemo(() => groupIdSelector(), []);
    const { options } = useDeepEqualSelector((state) => groupId(state, tableId)) ?? {
      options: [],
    };

    const trackGroupChange = useCallback(
      (groupSelection: string) => {
        track?.(
          METRIC_TYPE.CLICK,
          getTelemetryEvent.groupChanged({ groupingId: tableId, selected: groupSelection })
        );
        telemetry.reportEvent(AlertsEventTypes.AlertsGroupingChanged, {
          groupByField: groupSelection,
          tableId,
        });
      },
      [telemetry]
    );

    const onGroupChange = useCallback(
      (selectedGroups: string[]) => {
        selectedGroups.forEach((g) => trackGroupChange(g));
        dispatch(updateGroups({ activeGroups: selectedGroups, tableId }));
      },
      [dispatch, trackGroupChange]
    );

    const fields = useMemo(() => {
      return Object.values(sourcererDataView.fields || {});
    }, [sourcererDataView.fields]);

    const groupSelector = useGetGroupSelectorStateless({
      groupingId: tableId,
      onGroupChange,
      fields,
      defaultGroupingOptions: options,
      maxGroupingLevels: 3,
    });

    const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);

    const tableView = useShallowEqualSelector(
      (state) => (getTable(state, tableId) ?? tableDefaults).viewMode ?? tableDefaults.viewMode
    );

    const handleChangeTableView = useCallback(
      (selectedView: ViewSelection) => {
        dispatch(
          changeViewMode({
            id: tableId,
            viewMode: selectedView,
          })
        );
      },
      [dispatch]
    );

    const {
      showBuildingBlockAlerts,
      setShowBuildingBlockAlerts,
      showOnlyThreatIndicatorAlerts,
      setShowOnlyThreatIndicatorAlerts,
    } = useDataTableFilters(tableId);

    const additionalFiltersComponent = useMemo(
      () => (
        <AdditionalFiltersAction
          areEventsLoading={false}
          onShowBuildingBlockAlertsChanged={setShowBuildingBlockAlerts}
          showBuildingBlockAlerts={showBuildingBlockAlerts}
          onShowOnlyThreatIndicatorAlertsChanged={setShowOnlyThreatIndicatorAlerts}
          showOnlyThreatIndicatorAlerts={showOnlyThreatIndicatorAlerts}
        />
      ),
      [
        showBuildingBlockAlerts,
        setShowBuildingBlockAlerts,
        showOnlyThreatIndicatorAlerts,
        setShowOnlyThreatIndicatorAlerts,
      ]
    );

    const rightTopMenu = useMemo(
      () => (
        <EuiFlexGroup alignItems="center" gutterSize="m">
          {[TableId.alertsOnRuleDetailsPage, TableId.alertsOnAlertsPage].includes(tableId) && (
            <EuiFlexItem grow={false} data-test-subj="summary-view-selector">
              <SummaryViewSelector viewSelected={tableView} onViewChange={handleChangeTableView} />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>{additionalFiltersComponent}</EuiFlexItem>
          <EuiFlexItem grow={false}>{groupSelector}</EuiFlexItem>
        </EuiFlexGroup>
      ),
      [tableView, handleChangeTableView, additionalFiltersComponent, groupSelector]
    );

    return useMemo(() => ({ right: rightTopMenu }), [rightTopMenu]);
  };

  return usePersistentControls;
};
