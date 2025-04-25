/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useRef } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { AlertsTable } from '@kbn/response-ops-alerts-table';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import type {
  AlertsTableImperativeApi,
  AlertsTableProps,
} from '@kbn/response-ops-alerts-table/types';
import { TableId } from '@kbn/securitysolution-data-table';
import { getEsQueryConfig } from '@kbn/data-service';
import type { Filter, Query } from '@kbn/es-query';
import { buildTimeRangeFilter } from '../../../../../detections/components/alerts_table/helpers';
import { combineQueries } from '../../../../../common/lib/kuery';
import type { AdditionalTableContext } from '../../../../../detections/components/alert_summary/table/table';
import {
  ACTION_COLUMN_WIDTH,
  ALERT_TABLE_CONSUMERS,
  CASES_CONFIGURATION,
  columns,
  EuiDataGridStyleWrapper,
  GRID_STYLE,
  ROW_HEIGHTS_OPTIONS,
  RULE_TYPE_IDS,
  TOOLBAR_VISIBILITY,
} from '../../../../../detections/components/alert_summary/table/table';
import { ActionsCell } from '../../../../../detections/components/alert_summary/table/actions_cell';
import { getDataViewStateFromIndexFields } from '../../../../../common/containers/source/use_data_view';
import { useKibana } from '../../../../../common/lib/kibana';
import { CellValue } from '../../../../../detections/components/alert_summary/table/render_cell';
import type { RuleResponse } from '../../../../../../common/api/detection_engine';
import { useAdditionalBulkActions } from '../../../../../detections/hooks/alert_summary/use_additional_bulk_actions';

export interface TableProps {
  /**
   * DataView created for the alert summary page
   */
  dataView: DataView;
  /**
   * Filters passed from the rule details page.
   * These contain the default filters (alerts, show building block, status and threat match) as well
   * as the ones from the KQL bar.
   */
  filters: Filter[];
  /**
   * From value retrieved from the global KQL bar
   */
  from: string;
  /**
   * List of installed AI for SOC integrations
   */
  packages: PackageListItem[];
  /**
   * Query retrieved from the global KQL bar
   */
  query: Query;
  /**
   * Result from the useQuery to fetch the rule
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
  /**
   * To value retrieved from the global KQL bar
   */
  to: string;
}

/**
 * Component used in the Cases page under Alerts tab, only in the AI4DSOC tier.
 * It leverages a lot of configurations and constants from the Alert summary page alerts table, and renders the ResponseOps AlertsTable.
 */
export const Table = memo(
  ({ dataView, filters, from, packages, query, ruleResponse, to }: TableProps) => {
    const {
      services: {
        application,
        cases,
        data,
        fieldFormats,
        http,
        licensing,
        notifications,
        settings,
        uiSettings,
      },
    } = useKibana();
    const services = useMemo(
      () => ({
        cases,
        data,
        http,
        notifications,
        fieldFormats,
        application,
        licensing,
        settings,
      }),
      [application, cases, data, fieldFormats, http, licensing, notifications, settings]
    );

    const dataViewSpec = useMemo(() => dataView.toSpec(), [dataView]);

    const { browserFields } = useMemo(
      () => getDataViewStateFromIndexFields('', dataViewSpec.fields),
      [dataViewSpec.fields]
    );

    const timeRangeFilter = useMemo(() => buildTimeRangeFilter(from, to), [from, to]);
    const finalFilters = useMemo(
      () => [...filters, ...timeRangeFilter],
      [filters, timeRangeFilter]
    );

    const finalQuery: AlertsTableProps['query'] = useMemo(() => {
      const combinedQuery = combineQueries({
        config: getEsQueryConfig(uiSettings),
        dataProviders: [],
        dataViewSpec,
        browserFields,
        filters: finalFilters,
        kqlQuery: query,
        kqlMode: query.language,
      });

      if (combinedQuery?.kqlError || !combinedQuery?.filterQuery) {
        return { bool: {} };
      }

      try {
        const filter = JSON.parse(combinedQuery?.filterQuery);
        return { bool: { filter } };
      } catch {
        return { bool: {} };
      }
    }, [browserFields, dataViewSpec, finalFilters, query, uiSettings]);

    const additionalContext: AdditionalTableContext = useMemo(
      () => ({
        packages,
        ruleResponse,
      }),
      [packages, ruleResponse]
    );

    const refetchRef = useRef<AlertsTableImperativeApi>(null);
    const refetch = useCallback(() => {
      refetchRef.current?.refresh();
    }, []);

    const bulkActions = useAdditionalBulkActions({ refetch });

    return (
      <EuiDataGridStyleWrapper>
        <AlertsTable
          actionsColumnWidth={ACTION_COLUMN_WIDTH}
          additionalBulkActions={bulkActions}
          additionalContext={additionalContext}
          browserFields={browserFields}
          casesConfiguration={CASES_CONFIGURATION}
          columns={columns}
          consumers={ALERT_TABLE_CONSUMERS}
          gridStyle={GRID_STYLE}
          id={TableId.alertsOnRuleDetailsPage}
          query={finalQuery}
          ref={refetchRef}
          renderActionsCell={ActionsCell}
          renderCellValue={CellValue}
          rowHeightsOptions={ROW_HEIGHTS_OPTIONS}
          ruleTypeIds={RULE_TYPE_IDS}
          services={services}
          toolbarVisibility={TOOLBAR_VISIBILITY}
        />
      </EuiDataGridStyleWrapper>
    );
  }
);

Table.displayName = 'Table';
