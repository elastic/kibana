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
import { i18n } from '@kbn/i18n';
import { TableId } from '@kbn/securitysolution-data-table';
import { AlertsTable } from '@kbn/response-ops-alerts-table';
import type { AlertsTableProps } from '@kbn/response-ops-alerts-table/types';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { ESQL_RULE_TYPE_ID, QUERY_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import type {
  EuiDataGridProps,
  EuiDataGridStyle,
  EuiDataGridToolBarVisibilityOptions,
} from '@elastic/eui';
import { AdditionalToolbarControls } from './additional_toolbar_controls';
import { getDataViewStateFromIndexFields } from '../../../../common/containers/source/use_data_view';
import { inputsSelectors } from '../../../../common/store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { combineQueries } from '../../../../common/lib/kuery';
import { useKibana } from '../../../../common/lib/kibana';
import { CellValue } from './render_cell';
import { buildTimeRangeFilter } from '../../alerts_table/helpers';
import { useGlobalTime } from '../../../../common/containers/use_global_time';

const TIMESTAMP_COLUMN = i18n.translate(
  'xpack.securitySolution.alertSummary.table.column.timeStamp',
  { defaultMessage: 'Timestamp' }
);
const RELATION_INTEGRATION_COLUMN = i18n.translate(
  'xpack.securitySolution.alertSummary.table.column.relatedIntegrationName',
  { defaultMessage: 'Integration' }
);
const SEVERITY_COLUMN = i18n.translate(
  'xpack.securitySolution.alertSummary.table.column.severity',
  { defaultMessage: 'Severity' }
);
const RULE_NAME_COLUMN = i18n.translate(
  'xpack.securitySolution.alertSummary.table.column.ruleName',
  { defaultMessage: 'Rule' }
);

const TIMESTAMP = '@timestamp';
const RELATED_INTEGRATION = 'kibana.alert.rule.parameters';
const SEVERITY = 'kibana.alert.severity';
const RULE_NAME = 'kibana.alert.rule.name';

const columns: EuiDataGridProps['columns'] = [
  {
    id: TIMESTAMP,
    displayAsText: TIMESTAMP_COLUMN,
  },
  {
    id: RELATED_INTEGRATION,
    displayAsText: RELATION_INTEGRATION_COLUMN,
  },
  {
    id: SEVERITY,
    displayAsText: SEVERITY_COLUMN,
  },
  {
    id: RULE_NAME,
    displayAsText: RULE_NAME_COLUMN,
  },
];

const ALERT_TABLE_CONSUMERS: AlertsTableProps['consumers'] = [AlertConsumers.SIEM];
const RULE_TYPE_IDS = [ESQL_RULE_TYPE_ID, QUERY_RULE_TYPE_ID];
const ROW_HEIGHTS_OPTIONS = { defaultHeight: 40 };
const TOOLBAR_VISIBILITY: EuiDataGridToolBarVisibilityOptions = {
  showDisplaySelector: false,
  showKeyboardShortcuts: false,
  showFullScreenSelector: false,
};
const GRID_STYLE: EuiDataGridStyle = { border: 'horizontal' };

export interface TableProps {
  /**
   * DataView created for the alert summary page
   */
  dataView: DataView;
  /**
   * Groups filters passed from the GroupedAlertsTable component via the renderChildComponent callback
   */
  groupingFilters: Filter[];
}

/**
 * Renders the table showing all the alerts. This component leverages the ResponseOps AlertsTable in a similar way that the alerts page does.
 * The table is used in combination with the GroupedAlertsTable component.
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

  const getGlobalFiltersSelector = useMemo(() => inputsSelectors.globalFiltersQuerySelector(), []);
  const globalFilters = useDeepEqualSelector(getGlobalFiltersSelector);

  const { to, from } = useGlobalTime();
  const timeRangeFilter = useMemo(() => buildTimeRangeFilter(from, to), [from, to]);

  const filters = useMemo(
    () => [
      ...globalFilters,
      ...timeRangeFilter,
      ...groupingFilters.filter((filter) => filter.meta.type !== 'custom'),
    ],
    [globalFilters, groupingFilters, timeRangeFilter]
  );

  const dataViewSpec = useMemo(() => dataView.toSpec(), [dataView]);

  const { browserFields } = useMemo(
    () => getDataViewStateFromIndexFields('', dataViewSpec.fields),
    [dataViewSpec.fields]
  );

  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const globalQuery = useDeepEqualSelector(getGlobalQuerySelector);

  const query: AlertsTableProps['query'] = useMemo(() => {
    const combinedQuery = combineQueries({
      config: getEsQueryConfig(uiSettings),
      dataProviders: [],
      indexPattern: dataView,
      browserFields,
      filters,
      kqlQuery: globalQuery,
      kqlMode: globalQuery.language,
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
  }, [browserFields, dataView, filters, globalQuery, uiSettings]);

  const renderAdditionalToolbarControls = useCallback(
    () => <AdditionalToolbarControls dataView={dataView} />,
    [dataView]
  );

  return (
    <AlertsTable
      browserFields={browserFields}
      columns={columns}
      consumers={ALERT_TABLE_CONSUMERS}
      gridStyle={GRID_STYLE}
      id={TableId.alertsOnAlertSummaryPage}
      query={query}
      renderAdditionalToolbarControls={renderAdditionalToolbarControls}
      renderCellValue={CellValue}
      rowHeightsOptions={ROW_HEIGHTS_OPTIONS}
      ruleTypeIds={RULE_TYPE_IDS}
      services={services}
      toolbarVisibility={TOOLBAR_VISIBILITY}
    />
  );
});

Table.displayName = 'Table';
