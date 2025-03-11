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
import { useGetGroupSelectorStateless } from '@kbn/grouping/src/hooks/use_get_group_selector';
import { useDispatch } from 'react-redux';
import { DetectionEngineAlertsTable } from '../../alerts_table';
import { RELATED_INTEGRATION, RULE_NAME, SEVERITY, TIMESTAMP } from '../constants/fields';
import { Table } from './table';
import { updateGroups } from '../../../../common/store/grouping/actions';
import { groupIdSelector } from '../../../../common/store/grouping/selectors';
import { inputsSelectors } from '../../../../common/store';
import type { RunTimeMappings } from '../../../../sourcerer/store/model';
import { GroupedAlertsTable } from '../../alerts_table/alerts_grouping';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useGlobalTime } from '../../../../common/containers/use_global_time';

/**
 * The max size of the documents returned by Elasticsearch
 */
export const SAMPLE_SIZE = 500;

const globalFilters: Filter[] = [];
const hasIndexMaintenance = true;
const hasIndexWrite = true;
const runtimeMappings: RunTimeMappings = {};

/**
 *
 */
export const COLUMN_IDS = [TIMESTAMP, RELATED_INTEGRATION, SEVERITY, RULE_NAME];

export interface TableProps {
  /**
   *
   */
  dataView: DataView;
  /**
   * TEMP: for demo purposes ONLY, toggles between old and unified components
   */
  showUnifiedComponents: boolean;
}

/**
 *
 */
export const GroupedTable = memo(({ dataView, showUnifiedComponents }: TableProps) => {
  const dispatch = useDispatch();
  const indexNames = dataView.getIndexPattern();
  const { to, from } = useGlobalTime();

  const renderChildComponent = useCallback(
    (groupingFilters: Filter[]) => (
      <Table
        dataView={dataView}
        groupingFilters={groupingFilters}
        showUnifiedComponents={showUnifiedComponents}
      />
    ),
    [dataView, showUnifiedComponents]
  );
  const renderChildDetectionEngineComponent = useCallback((groupingFilters: Filter[]) => {
    return (
      <DetectionEngineAlertsTable
        tableType={TableId.alertsOnAlertSummaryPage}
        inputFilters={groupingFilters}
        isLoading={false}
      />
    );
  }, []);
  const renderChildAlertsTableComponent = useCallback(
    (groupingFilters: Filter[]) => (
      <Table
        dataView={dataView}
        groupingFilters={groupingFilters}
        showUnifiedComponents={showUnifiedComponents}
      />
    ),
    [dataView, showUnifiedComponents]
  );

  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const globalQuery = useDeepEqualSelector(getGlobalQuerySelector);

  const onGroupChange = useCallback(
    (selectedGroups: string[]) => {
      dispatch(
        updateGroups({ activeGroups: selectedGroups, tableId: TableId.alertsOnAlertSummaryPage })
      );
    },
    [dispatch]
  );
  const groupId = useMemo(() => groupIdSelector(), []);
  const { options: defaultGroupingOptions } = useDeepEqualSelector((state) =>
    groupId(state, TableId.alertsOnAlertSummaryPage)
  ) ?? {
    options: [],
  };
  const groupSelector = useGetGroupSelectorStateless({
    groupingId: TableId.alertsOnAlertSummaryPage,
    onGroupChange,
    fields: dataView.fields,
    defaultGroupingOptions,
    maxGroupingLevels: 3,
  });

  return (
    <>
      {showUnifiedComponents ? (
        <>
          {groupSelector}
          <GroupedAlertsTable
            dataView={dataView}
            from={from}
            globalFilters={globalFilters}
            globalQuery={globalQuery}
            hasIndexMaintenance={hasIndexMaintenance}
            hasIndexWrite={hasIndexWrite}
            loading={false}
            renderChildComponent={renderChildComponent}
            runtimeMappings={runtimeMappings}
            signalIndexName={indexNames}
            tableId={TableId.alertsOnAlertSummaryPage}
            to={to}
          />
        </>
      ) : (
        <GroupedAlertsTable
          from={from}
          globalFilters={globalFilters}
          globalQuery={globalQuery}
          hasIndexMaintenance={hasIndexMaintenance}
          hasIndexWrite={hasIndexWrite}
          loading={false}
          renderChildComponent={renderChildAlertsTableComponent}
          runtimeMappings={runtimeMappings}
          signalIndexName={indexNames}
          tableId={TableId.alertsOnAlertSummaryPage}
          to={to}
        />
      )}
    </>
  );
});

GroupedTable.displayName = 'GroupedTable';
