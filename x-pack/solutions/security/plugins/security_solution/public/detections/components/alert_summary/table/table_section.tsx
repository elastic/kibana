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
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { TableSectionContextProvider } from './table_section_context';
import { groupStatsRenderer } from './group_stats_renderers';
import { groupingOptions } from './grouping_options';
import { groupTitleRenderers } from './group_title_renderers';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { Table } from './table';
import { inputsSelectors } from '../../../../common/store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { GroupedAlertsTable } from '../../alerts_table/alerts_grouping';
import { groupStatsAggregations } from './group_stats_aggregations';
import type { RuleResponse } from '../../../../../common/api/detection_engine';

export const GROUPED_TABLE_TEST_ID = 'alert-summary-grouped-table';

export interface TableSectionProps {
  /**
   * DataView created for the alert summary page
   */
  dataView: DataView;
  /**
   * List of installed AI for SOC integrations
   */
  packages: PackageListItem[];
  /**
   * Result from the useQuery to fetch all rules
   */
  ruleResponse: {
    /**
     * Result from fetching all rules
     */
    rules: RuleResponse[];
    /**
     * True while rules are being fetched
     */
    isLoading: boolean;
  };
}

/**
 * Section rendering the table in the alert summary page.
 * This component leverages the GroupedAlertsTable and the ResponseOps AlertsTable also used in the alerts page.
 */
export const TableSection = memo(({ dataView, packages, ruleResponse }: TableSectionProps) => {
  const dataViewSpec = useMemo(() => dataView.toSpec(), [dataView]);
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
    (groupingFilters: Filter[]) => (
      <Table
        dataView={dataView}
        groupingFilters={groupingFilters}
        packages={packages}
        ruleResponse={ruleResponse}
      />
    ),
    [dataView, packages, ruleResponse]
  );

  return (
    <TableSectionContextProvider packages={packages} ruleResponse={ruleResponse}>
      <div data-test-subj={GROUPED_TABLE_TEST_ID}>
        <GroupedAlertsTable
          accordionButtonContent={groupTitleRenderers}
          accordionExtraActionGroupStats={accordionExtraActionGroupStats}
          dataViewSpec={dataViewSpec}
          defaultGroupingOptions={groupingOptions}
          from={from}
          globalFilters={filters}
          globalQuery={globalQuery}
          loading={false}
          renderChildComponent={renderChildComponent}
          tableId={TableId.alertsOnAlertSummaryPage}
          to={to}
        />
      </div>
    </TableSectionContextProvider>
  );
});

TableSection.displayName = 'TableSection';
