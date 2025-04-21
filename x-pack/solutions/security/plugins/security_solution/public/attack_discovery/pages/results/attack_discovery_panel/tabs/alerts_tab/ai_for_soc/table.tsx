/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { AlertsTable } from '@kbn/response-ops-alerts-table';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { AdditionalTableContext } from '../../../../../../../detections/components/alert_summary/table/table';
import {
  ACTION_COLUMN_WIDTH,
  ALERT_TABLE_CONSUMERS,
  columns,
  GRID_STYLE,
  ROW_HEIGHTS_OPTIONS,
  RULE_TYPE_IDS,
  TOOLBAR_VISIBILITY,
} from '../../../../../../../detections/components/alert_summary/table/table';
import { ActionsCell } from '../../../../../../../detections/components/alert_summary/table/actions_cell';
import { getDataViewStateFromIndexFields } from '../../../../../../../common/containers/source/use_data_view';
import { useKibana } from '../../../../../../../common/lib/kibana';
import { CellValue } from '../../../../../../../detections/components/alert_summary/table/render_cell';
import type { RuleResponse } from '../../../../../../../../common/api/detection_engine';

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
   * List of installed AI for SOC integrations
   */
  packages: PackageListItem[];
  /**
   * Query that contains the id of the alerts to display in the table
   */
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
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
 * Component used in the Attack Discovery alerts table, only in the AI4DSOC tier.
 * It leverages a lot of configurations and constants from the Alert summary page alerts table, and renders the ResponseOps AlertsTable.
 */
export const Table = memo(({ dataView, id, packages, query, ruleResponse }: TableProps) => {
  const {
    services: { application, data, fieldFormats, http, licensing, notifications, settings },
  } = useKibana();
  const services = useMemo(
    () => ({
      data,
      http,
      notifications,
      fieldFormats,
      application,
      licensing,
      settings,
    }),
    [application, data, fieldFormats, http, licensing, notifications, settings]
  );

  const dataViewSpec = useMemo(() => dataView.toSpec(), [dataView]);

  const { browserFields } = useMemo(
    () => getDataViewStateFromIndexFields('', dataViewSpec.fields),
    [dataViewSpec.fields]
  );

  const additionalContext: AdditionalTableContext = useMemo(
    () => ({
      packages,
      ruleResponse,
    }),
    [packages, ruleResponse]
  );

  return (
    <AlertsTable
      actionsColumnWidth={ACTION_COLUMN_WIDTH}
      additionalContext={additionalContext}
      browserFields={browserFields}
      columns={columns}
      consumers={ALERT_TABLE_CONSUMERS}
      gridStyle={GRID_STYLE}
      id={id}
      query={query}
      renderActionsCell={ActionsCell}
      renderCellValue={CellValue}
      rowHeightsOptions={ROW_HEIGHTS_OPTIONS}
      ruleTypeIds={RULE_TYPE_IDS}
      services={services}
      toolbarVisibility={TOOLBAR_VISIBILITY}
    />
  );
});

Table.displayName = 'Table';
