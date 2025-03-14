/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-service';
import { TableId } from '@kbn/securitysolution-data-table';
import { AlertsTable } from '@kbn/response-ops-alerts-table';
import type { AlertsTableProps } from '@kbn/response-ops-alerts-table/types';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { ESQL_RULE_TYPE_ID, QUERY_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import type { EuiDataGridProps } from '@elastic/eui';
import { ActionsCell } from './actions_cell';
import { CellValue } from './render_cell';
import { getBulkActions } from '../utils/get_bulk_actions';
import { AdditionalToolbarControls } from './additional_toolbar_controls';
import { getDataViewStateFromIndexFields } from '../../../../common/containers/source/use_data_view';
import { inputsSelectors } from '../../../../common/store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { combineQueries } from '../../../../common/lib/kuery';
import { RELATED_INTEGRATION, RULE_NAME, SEVERITY, TIMESTAMP } from '../constants/fields';
import {
  RELATION_INTEGRATION_COLUMN,
  RULE_NAME_COLUMN,
  SEVERITY_COLUMN,
  TIMESTAMP_COLUMN,
} from './translations';
import { useKibana } from '../../../../common/lib/kibana';

const ALERT_TABLE_CONSUMERS: AlertsTableProps['consumers'] = [AlertConsumers.SIEM];

export const RULE_TYPE_IDS = [ESQL_RULE_TYPE_ID, QUERY_RULE_TYPE_ID];

const columns: EuiDataGridProps['columns'] = [
  {
    id: TIMESTAMP,
    displayAsText: TIMESTAMP_COLUMN,
    initialWidth: 225,
  },
  {
    id: RELATED_INTEGRATION,
    displayAsText: RELATION_INTEGRATION_COLUMN,
    initialWidth: 225,
  },
  {
    id: SEVERITY,
    displayAsText: SEVERITY_COLUMN,
    initialWidth: 225,
  },
  {
    id: RULE_NAME,
    displayAsText: RULE_NAME_COLUMN,
    initialWidth: 225,
  },
];

export interface TableProps {
  /**
   *
   */
  dataView: DataView;
  /**
   *
   */
  groupingFilters: Filter[];
}

/**
 *
 */
export const Table = memo(({ dataView, groupingFilters }: TableProps) => {
  const {
    services: {
      application,
      data,
      fieldFormats,
      http,
      licensing,
      notifications,
      uiSettings,
      settings,
    },
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

  const filters = groupingFilters.filter((filter) => filter.meta.type !== 'custom');

  const { browserFields } = getDataViewStateFromIndexFields('', dataView.toSpec().fields);
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const globalQuery = useDeepEqualSelector(getGlobalQuerySelector);
  const combinedQuery = useMemo(() => {
    return combineQueries({
      config: getEsQueryConfig(uiSettings),
      dataProviders: [],
      indexPattern: dataView.toSpec(),
      browserFields,
      filters,
      kqlQuery: globalQuery,
      kqlMode: globalQuery.language,
    });
  }, [browserFields, dataView, filters, globalQuery, uiSettings]);
  const finalBoolQuery: AlertsTableProps['query'] = useMemo(() => {
    if (combinedQuery?.kqlError || !combinedQuery?.filterQuery) {
      return { bool: {} };
    }
    return { bool: { filter: JSON.parse(combinedQuery?.filterQuery) } };
  }, [combinedQuery?.filterQuery, combinedQuery?.kqlError]);

  const bulkActions = useMemo(() => getBulkActions(), []);

  const renderAdditionalToolbarControls = useCallback(
    () => <AdditionalToolbarControls dataView={dataView} />,
    [dataView]
  );

  return (
    <AlertsTable
      actionsColumnWidth={98}
      browserFields={browserFields}
      columns={columns}
      consumers={ALERT_TABLE_CONSUMERS}
      getBulkActions={bulkActions}
      id={TableId.alertsOnAlertSummaryPage}
      query={finalBoolQuery}
      renderAdditionalToolbarControls={renderAdditionalToolbarControls}
      renderActionsCell={ActionsCell}
      renderCellValue={CellValue}
      ruleTypeIds={RULE_TYPE_IDS}
      services={services}
    />
  );
});

Table.displayName = 'Table';
