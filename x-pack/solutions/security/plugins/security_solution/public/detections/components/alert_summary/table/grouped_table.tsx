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
import { Table } from './table';
import { inputsSelectors } from '../../../../common/store';
import type { RunTimeMappings } from '../../../../sourcerer/store/model';
import { GroupedAlertsTable } from '../../alerts_table/alerts_grouping';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useGlobalTime } from '../../../../common/containers/use_global_time';

const globalFilters: Filter[] = [];
const hasIndexMaintenance = true;
const hasIndexWrite = true;
const runtimeMappings: RunTimeMappings = {};

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

  const renderChildComponent = useCallback(
    (groupingFilters: Filter[]) => <Table dataView={dataView} groupingFilters={groupingFilters} />,
    [dataView]
  );

  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const globalQuery = useDeepEqualSelector(getGlobalQuerySelector);

  return (
    <GroupedAlertsTable
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
  );
});

GroupedTable.displayName = 'GroupedTable';
