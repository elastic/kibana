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
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { AlertsTableImperativeApi } from '@kbn/response-ops-alerts-table/types';
import { useBrowserFields } from '../../../../../../../data_view_manager/hooks/use_browser_fields';
import { PageScope } from '../../../../../../../data_view_manager/constants';
import type { AdditionalTableContext } from '../../../../../../../detections/components/alert_summary/table/table';
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
} from '../../../../../../../detections/components/alert_summary/table/table';
import { ActionsCell } from '../../../../../../../detections/components/alert_summary/table/actions_cell';
import { useKibana } from '../../../../../../../common/lib/kibana';
import { CellValue } from '../../../../../../../detections/components/alert_summary/table/render_cell';
import { useAdditionalBulkActions } from '../../../../../../../detections/hooks/alert_summary/use_additional_bulk_actions';

export interface TableProps {
  /**
   * DataView created for the alert summary page
   */
  dataView: DataView;
  /**
   * Id to pass down to the ResponseOps alerts table
   */
  id: string;
  /**
   * List of installed EASE integrations
   */
  packages: PackageListItem[];
  /**
   * Query that contains the id of the alerts to display in the table
   */
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
}

/**
 * Component used in the Attack Discovery alerts table, only in the EASE tier.
 * It leverages a lot of configurations and constants from the Alert summary page alerts table, and renders the ResponseOps AlertsTable.
 */
export const Table = memo(({ dataView, id, packages, query }: TableProps) => {
  const {
    services: { application, cases, data, fieldFormats, http, licensing, notifications, settings },
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

  const browserFields = useBrowserFields(PageScope.alerts);

  const additionalContext: AdditionalTableContext = useMemo(
    () => ({
      packages,
    }),
    [packages]
  );

  const refetchRef = useRef<AlertsTableImperativeApi>(null);
  const refetch = useCallback(() => {
    refetchRef.current?.refresh();
  }, []);

  const bulkActions = useAdditionalBulkActions({ refetch });

  const runtimeMappings = useMemo(() => dataView.getRuntimeMappings(), [dataView]);

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
        id={id}
        isMutedAlertsEnabled={false}
        query={query}
        ref={refetchRef}
        renderActionsCell={ActionsCell}
        renderCellValue={CellValue}
        rowHeightsOptions={ROW_HEIGHTS_OPTIONS}
        runtimeMappings={runtimeMappings}
        ruleTypeIds={RULE_TYPE_IDS}
        services={services}
        toolbarVisibility={TOOLBAR_VISIBILITY}
      />
    </EuiDataGridStyleWrapper>
  );
});

Table.displayName = 'Table';
