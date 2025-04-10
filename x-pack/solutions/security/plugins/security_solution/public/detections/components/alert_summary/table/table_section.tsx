/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { TableId } from '@kbn/securitysolution-data-table';
import { groupStatsRenderer } from './group_stats_renderers';
import { groupingOptions } from './grouping_options';
import { groupTitleRenderers } from './group_title_renderers';
import type { RunTimeMappings } from '../../../../sourcerer/store/model';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { Table } from './table';
import { inputsSelectors } from '../../../../common/store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { GroupedAlertsTable } from '../../alerts_table/alerts_grouping';
import { groupStatsAggregations } from './group_stats_aggregations';

export const GROUPED_TABLE_TEST_ID = 'alert-summary-grouped-table';

const runtimeMappings: RunTimeMappings = {};

export interface TableSectionProps {
  /**
   * DataView created for the alert summary page
   */
  dataView: DataView;
}

/**
 * Section rendering the table in the alert summary page.
 * This component leverages the GroupedAlertsTable and the ResponseOps AlertsTable also used in the alerts page.
 */
export const TableSection = memo(({ dataView }: TableSectionProps) => {
  const indexNames = useMemo(() => dataView.getIndexPattern(), [dataView]);
  const { to, from } = useGlobalTime();

  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const globalQuery = useDeepEqualSelector(getGlobalQuerySelector);

  const getGlobalFiltersSelector = useMemo(() => inputsSelectors.globalFiltersQuerySelector(), []);
  const filters = useDeepEqualSelector(getGlobalFiltersSelector);

  const accordionExtraActionGroupStats = useMemo(
    () => ({
      aggregations: groupStatsAggregations,
      renderer: groupStatsRenderer,
    }),
    []
  );

  const renderChildComponent = useCallback(
    (groupingFilters: Filter[]) => <Table dataView={dataView} groupingFilters={groupingFilters} />,
    [dataView]
  );

  return (
    <div data-test-subj={GROUPED_TABLE_TEST_ID}>
      <GroupedAlertsTable
        accordionButtonContent={groupTitleRenderers}
        accordionExtraActionGroupStats={accordionExtraActionGroupStats}
        defaultGroupingOptions={groupingOptions}
        from={from}
        globalFilters={filters}
        globalQuery={globalQuery}
        loading={false}
        renderChildComponent={renderChildComponent}
        runtimeMappings={runtimeMappings}
        signalIndexName={indexNames}
        tableId={TableId.alertsOnAlertSummaryPage}
        to={to}
      />
    </div>
  );
});

TableSection.displayName = 'TableSection';
