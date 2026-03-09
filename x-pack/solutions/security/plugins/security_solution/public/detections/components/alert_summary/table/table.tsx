/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useRef } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-service';
import { i18n } from '@kbn/i18n';
import { TableId } from '@kbn/securitysolution-data-table';
import { AlertsTable } from '@kbn/response-ops-alerts-table';
import type {
  AlertsTableImperativeApi,
  AlertsTableProps,
} from '@kbn/response-ops-alerts-table/types';
import { ALERT_RULE_NAME, ALERT_SEVERITY, AlertConsumers, TIMESTAMP } from '@kbn/rule-data-utils';
import { ESQL_RULE_TYPE_ID, QUERY_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import type {
  EuiDataGridProps,
  EuiDataGridStyle,
  EuiDataGridToolBarVisibilityOptions,
} from '@elastic/eui';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import styled from '@emotion/styled';
import { RELATED_INTEGRATION } from '../../../constants';
import { useBrowserFields } from '../../../../data_view_manager/hooks/use_browser_fields';
import { PageScope } from '../../../../data_view_manager/constants';
import { useAdditionalBulkActions } from '../../../hooks/alert_summary/use_additional_bulk_actions';
import { APP_ID, CASES_FEATURE_ID } from '../../../../../common';
import { ActionsCell } from './actions_cell';
import { AdditionalToolbarControls } from './additional_toolbar_controls';
import { inputsSelectors } from '../../../../common/store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { combineQueries } from '../../../../common/lib/kuery';
import { useKibana } from '../../../../common/lib/kibana';
import { CellValue } from './render_cell';
import { buildTimeRangeFilter } from '../../alerts_table/helpers';
import { useGlobalTime } from '../../../../common/containers/use_global_time';

export const TIMESTAMP_COLUMN = i18n.translate(
  'xpack.securitySolution.alertSummary.table.column.timeStamp',
  { defaultMessage: 'Timestamp' }
);
export const RELATED_INTEGRATION_COLUMN = i18n.translate(
  'xpack.securitySolution.alertSummary.table.column.relatedIntegrationName',
  { defaultMessage: 'Integration' }
);
export const SEVERITY_COLUMN = i18n.translate(
  'xpack.securitySolution.alertSummary.table.column.severity',
  { defaultMessage: 'Severity' }
);
export const RULE_NAME_COLUMN = i18n.translate(
  'xpack.securitySolution.alertSummary.table.column.ruleName',
  { defaultMessage: 'Rule' }
);

export const columns: EuiDataGridProps['columns'] = [
  {
    id: TIMESTAMP,
    displayAsText: TIMESTAMP_COLUMN,
  },
  {
    id: RELATED_INTEGRATION,
    displayAsText: RELATED_INTEGRATION_COLUMN,
  },
  {
    id: ALERT_SEVERITY,
    displayAsText: SEVERITY_COLUMN,
  },
  {
    id: ALERT_RULE_NAME,
    displayAsText: RULE_NAME_COLUMN,
  },
];

export const ACTION_COLUMN_WIDTH = 72; // px
export const ALERT_TABLE_CONSUMERS: AlertsTableProps['consumers'] = [AlertConsumers.SIEM];
export const RULE_TYPE_IDS = [ESQL_RULE_TYPE_ID, QUERY_RULE_TYPE_ID];
export const ROW_HEIGHTS_OPTIONS = { defaultHeight: 40 };
export const TOOLBAR_VISIBILITY: EuiDataGridToolBarVisibilityOptions = {
  showDisplaySelector: false,
  showKeyboardShortcuts: false,
  showFullScreenSelector: false,
};
export const GRID_STYLE: EuiDataGridStyle = { border: 'horizontal' };
export const CASES_CONFIGURATION = {
  featureId: CASES_FEATURE_ID,
  owner: [APP_ID],
  syncAlerts: true,
  extractObservables: true,
};

// This will guarantee that ALL cells will have their values vertically centered.
// While these styles were originally applied in the RenderCell component, they were not applied to the bulk action checkboxes.
// These are necessary because the ResponseOps alerts table is not centering values vertically, which is visible when using a custom row height.
export const EuiDataGridStyleWrapper = styled.div`
  div .euiDataGridRowCell__content {
    align-items: center;
    display: flex;
    height: 100%;
  }
`;

export interface AdditionalTableContext {
  /**
   * List of installed EASE integrations
   */
  packages: PackageListItem[];
}

export interface TableProps {
  /**
   * DataView created for the alert summary page
   */
  dataView: DataView;
  /**
   * Groups filters passed from the GroupedAlertsTable component via the renderChildComponent callback
   */
  groupingFilters: Filter[];
  /**
   * List of installed EASE integrations
   */
  packages: PackageListItem[];
}

/**
 * Renders the table showing all the alerts. This component leverages the ResponseOps AlertsTable in a similar way that the alerts page does.
 * The table is used in combination with the GroupedAlertsTable component.
 */
export const Table = memo(({ dataView, groupingFilters, packages }: TableProps) => {
  const {
    services: {
      application,
      cases,
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

  const browserFields = useBrowserFields(PageScope.alerts);

  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const globalQuery = useDeepEqualSelector(getGlobalQuerySelector);

  const query: AlertsTableProps['query'] = useMemo(() => {
    const combinedQuery = combineQueries({
      config: getEsQueryConfig(uiSettings),
      dataProviders: [],
      dataView,
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

  const additionalContext: AdditionalTableContext = useMemo(() => ({ packages }), [packages]);

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
        id={TableId.alertsOnAlertSummaryPage}
        isMutedAlertsEnabled={false}
        query={query}
        ref={refetchRef}
        renderActionsCell={ActionsCell}
        renderAdditionalToolbarControls={renderAdditionalToolbarControls}
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
