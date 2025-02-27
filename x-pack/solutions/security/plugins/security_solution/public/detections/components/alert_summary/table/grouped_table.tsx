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
import { DataLoadingState } from '@kbn/unified-data-table';
import { inputsSelectors } from '../../../../common/store';
import { Table } from './table';
import type { RunTimeMappings } from '../../../../sourcerer/store/model';
import { GroupedAlertsTable } from '../../alerts_table/alerts_grouping';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useTimelineEvents } from '../../../../timelines/containers';

/**
 * The max size of the documents returned by Elasticsearch
 */
export const SAMPLE_SIZE = 500;

/**
 *
 */
export const COLUMN_IDS = [
  '@timestamp',
  'source',
  'kibana.alert.severity',
  'kibana.alert.rule.name',
];

export interface TableProps {
  /**
   *
   */
  dataView: DataView;
}

/**
 *
 */
export const GroupedTable = memo(({ dataView }: TableProps) => {
  const indexNames = dataView.getIndexPattern();
  const { to, from } = useGlobalTime();

  const [loadingState, { events }] = useTimelineEvents({
    dataViewId: dataView.id as string,
    endDate: to,
    fields: COLUMN_IDS,
    id: 'alert-summary',
    indexNames: [indexNames],
    limit: SAMPLE_SIZE,
    runtimeMappings: undefined,
    startDate: from,
  });

  const globalFilters: Filter[] = [];
  const hasIndexMaintenance = false;
  const hasIndexWrite = false;
  const renderChildComponent = useCallback(
    () => <Table dataView={dataView} events={events} loadingState={loadingState} />,
    [dataView, events, loadingState]
  );
  const runtimeMappings: RunTimeMappings = undefined;

  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const globalQuery = useDeepEqualSelector(getGlobalQuerySelector);

  return (
    <GroupedAlertsTable
      dataView={dataView}
      from={from}
      globalFilters={globalFilters}
      globalQuery={globalQuery}
      hasIndexMaintenance={hasIndexMaintenance}
      hasIndexWrite={hasIndexWrite}
      loading={loadingState === DataLoadingState.loading}
      renderChildComponent={renderChildComponent}
      runtimeMappings={runtimeMappings}
      signalIndexName={indexNames}
      tableId={TableId.alertsOnAlertSummaryPage}
      to={to}
    />
  );
});

GroupedTable.displayName = 'GroupedTable';
