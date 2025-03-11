/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import type {
  CustomCellRenderer,
  CustomGridColumnProps,
  CustomGridColumnsConfiguration,
} from '@kbn/unified-data-table';
import { UnifiedDataTable } from '@kbn/unified-data-table';
import type { DataView } from '@kbn/data-views-plugin/common';
import type {
  DataTableRecord,
  RowControlColumn,
  RowControlComponent,
  RowControlRowProps,
} from '@kbn/discover-utils';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { Filter } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-service';
import { TableId } from '@kbn/securitysolution-data-table';
import { AlertsTable } from '@kbn/response-ops-alerts-table';
import type { AlertsTableProps } from '@kbn/response-ops-alerts-table/types';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { ESQL_RULE_TYPE_ID, QUERY_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import type { EuiDataGridProps } from '@elastic/eui';
import { EuiButtonIcon } from '@elastic/eui';
import { useGetGroupSelectorStateless } from '@kbn/grouping/src/hooks/use_get_group_selector';
import { useDispatch } from 'react-redux';
import type { EuiDataGridControlColumn } from '@elastic/eui/src/components/datagrid/data_grid_types';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { GetSecurityAlertsTableProp } from '../../alerts_table/types';
import { groupIdSelector } from '../../../../common/store/grouping/selectors';
import { updateGroups } from '../../../../common/store/grouping/actions';
import { getDataViewStateFromIndexFields } from '../../../../common/containers/source/use_data_view';
import { inputsSelectors } from '../../../../common/store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { combineQueries } from '../../../../common/lib/kuery';
import { KibanaAlertRelatedIntegrationCellRenderer } from '../cell_renderers/kibana_alert_related_integration';
import { RELATED_INTEGRATION, RULE_NAME, SEVERITY, TIMESTAMP } from '../constants/fields';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useTimelineEvents } from '../../../../timelines/containers';
import { EmptyComponent } from '../../../../common/lib/cell_actions/helpers';
import { MoreActionsRowControlColumn } from '../leading_controls/more_actions';
import { AssistantRowControlColumn } from '../leading_controls/assistant';
import {
  ACTIONS_COLUMN,
  RELATION_INTEGRATION_COLUMN,
  RULE_NAME_COLUMN,
  SEVERITY_COLUMN,
  TIMESTAMP_COLUMN,
} from './translations';
import { KibanaAlertSeverityCellRenderer } from '../cell_renderers/kibana_alert_severity';
import { COLUMN_IDS, SAMPLE_SIZE } from './grouped_table';
import { transformTimelineItemToUnifiedRows } from '../../../../timelines/components/timeline/unified_components/utils';
import { useKibana } from '../../../../common/lib/kibana';
import { IOCPanelKey } from '../../../../flyout/ai_for_soc/constants/panel_keys';
import { useBulkAlertTagsItems } from '../../../../common/components/toolbar/bulk_actions/use_bulk_alert_tags_items';

const ALERT_TABLE_CONSUMERS: AlertsTableProps['consumers'] = [AlertConsumers.SIEM];

/**
 *
 */
const rowsPerPageOptions = [10, 25, 50, 100];

export const RULE_TYPE_IDS = [ESQL_RULE_TYPE_ID, QUERY_RULE_TYPE_ID];

/**
 *
 */
const customGridColumnsConfiguration: CustomGridColumnsConfiguration = {
  [TIMESTAMP]: (props: CustomGridColumnProps) => ({
    ...props.column,
    displayAsText: TIMESTAMP_COLUMN,
    initialWidth: 225,
  }),
  [RELATED_INTEGRATION]: (props: CustomGridColumnProps) => ({
    ...props.column,
    displayAsText: RELATION_INTEGRATION_COLUMN,
  }),
  [SEVERITY]: (props: CustomGridColumnProps) => ({
    ...props.column,
    displayAsText: SEVERITY_COLUMN,
    initialWidth: 125,
  }),
  [RULE_NAME]: (props: CustomGridColumnProps) => ({
    ...props.column,
    displayAsText: RULE_NAME_COLUMN,
  }),
};
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

export interface RenderAdditionalToolbarControlsProps {
  /**
   *
   */
  dataView: DataView;
}

export const RenderAdditionalToolbarControls = memo(
  ({ dataView }: RenderAdditionalToolbarControlsProps) => {
    const dispatch = useDispatch();

    const onGroupChange = useCallback(
      (selectedGroups: string[]) =>
        dispatch(
          updateGroups({ activeGroups: selectedGroups, tableId: TableId.alertsOnAlertSummaryPage })
        ),
      [dispatch]
    );
    const groupId = useMemo(() => groupIdSelector(), []);
    const { options: defaultGroupingOptions } = useDeepEqualSelector((state) =>
      groupId(state, TableId.alertsOnAlertSummaryPage)
    ) ?? {
      options: [],
    };
    const groupSelector = useGetGroupSelectorStateless({
      groupingId: TableId.alertsOnAlertSummaryPage,
      onGroupChange,
      fields: dataView.fields,
      defaultGroupingOptions,
      maxGroupingLevels: 3,
    });

    return <>{groupSelector}</>;
  }
);
RenderAdditionalToolbarControls.displayName = 'RenderAdditionalToolbarControls';

export const ActionsCellComponent = memo(({ rowIndex, ecsAlert, leadingControlColumn }) => {
  const Action = leadingControlColumn.rowCellRender;
  return <>{'hello'}</>;
});
ActionsCellComponent.displayName = 'ActionsCellComponent';

export const getBulkActionsByTableType =
  (): GetSecurityAlertsTableProp<'getBulkActions'> => (query, refresh) => {
    const bulkAlertTagParams = useMemo(() => {
      return {
        refetch: refresh,
      };
    }, [refresh]);
    const { alertTagsItems, alertTagsPanels } = useBulkAlertTagsItems(bulkAlertTagParams);

    const items = useMemo(() => {
      return [...alertTagsItems];
    }, [alertTagsItems]);
    return useMemo(() => {
      return [{ id: 0, items }, ...alertTagsPanels];
    }, [alertTagsPanels, items]);
  };

export interface TableProps {
  /**
   *
   */
  dataView: DataView;
  /**
   *
   */
  groupingFilters: Filter[];
  /**
   * TEMP: for demo purposes ONLY, toggles between old and unified components
   */
  showUnifiedComponents: boolean;
}

/**
 *
 */
export const Table = memo(({ dataView, groupingFilters, showUnifiedComponents }: TableProps) => {
  const indexNames = dataView.getIndexPattern();
  const { to, from } = useGlobalTime();

  const {
    services: {
      application,
      data,
      dataViewFieldEditor,
      fieldFormats,
      http,
      licensing,
      notifications,
      storage,
      theme,
      uiSettings,
      settings,
    },
  } = useKibana();

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

  const [loadingState, { events, totalCount }] = useTimelineEvents({
    dataViewId: dataView.id as string,
    endDate: to,
    fields: COLUMN_IDS,
    filterQuery: combinedQuery?.filterQuery,
    id: 'alert-summary',
    indexNames: [indexNames],
    limit: SAMPLE_SIZE,
    runtimeMappings: undefined,
    startDate: from,
  });

  const onSetColumns = useCallback(() => window.alert('onSetColumns'), []);
  const showTimeCol = useMemo(() => !!dataView && !!dataView.timeFieldName, [dataView]);
  const [rowsPerPage, setRowsPerPage] = useState<number>(rowsPerPageOptions[1]);
  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>();

  const { tableRows: rows } = useMemo(
    () => transformTimelineItemToUnifiedRows({ events, dataView }),
    [events, dataView]
  );

  const onUpdateRowsPerPage = useCallback((r) => setRowsPerPage(r), []);

  const services = useMemo(
    () => ({
      theme,
      fieldFormats,
      storage,
      toastNotifications: notifications.toasts,
      uiSettings,
      dataViewFieldEditor,
      data,
    }),
    [theme, fieldFormats, storage, notifications.toasts, uiSettings, dataViewFieldEditor, data]
  );
  const services2 = useMemo(
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

  const externalCustomRenderers: CustomCellRenderer = {
    [RELATED_INTEGRATION]: (e) => (
      <KibanaAlertRelatedIntegrationCellRenderer value={e.row.flattened[e.columnId]} />
    ),
    [SEVERITY]: (e) => <KibanaAlertSeverityCellRenderer value={e.row.flattened[e.columnId]} />,
  };

  const rowAdditionalLeadingControls: RowControlColumn[] = useMemo(
    () => [
      {
        id: '1',
        headerAriaLabel: '',
        renderControl: (_: RowControlComponent, props: RowControlRowProps) => (
          <AssistantRowControlColumn />
        ),
      },
      {
        id: '2',
        headerAriaLabel: '',
        renderControl: (_: RowControlComponent, props: RowControlRowProps) => (
          <MoreActionsRowControlColumn ecs={props.record.ecs} />
        ),
      },
    ],
    []
  );

  const { openFlyout } = useExpandableFlyoutApi();
  const onOpenFlyout = useCallback(
    (ecs: Ecs) =>
      openFlyout({
        right: {
          id: IOCPanelKey,
          params: {
            doc: ecs,
          },
        },
      }),
    [openFlyout]
  );
  const onSetExpandedDoc = useCallback(
    (doc: DataTableRecord | undefined) => {
      if (doc) {
        setExpandedDoc(doc);
        openFlyout({
          right: {
            id: IOCPanelKey,
            params: {
              doc,
            },
          },
        });
      } else {
        setExpandedDoc(undefined);
      }
    },
    [openFlyout]
  );

  const leadingControlColumns: EuiDataGridControlColumn[] = useMemo(
    () => [
      {
        id: '1',
        width: 98,
        headerCellRender: () => <>{ACTIONS_COLUMN}</>,
        rowCellRender: (cellData) => (
          <>
            <EuiButtonIcon
              iconType="expand"
              onClick={() => onOpenFlyout(cellData.ecsAlertsData[cellData.rowIndex])}
              size="s"
              color="primary"
            />
            <AssistantRowControlColumn />
            <MoreActionsRowControlColumn ecs={cellData.ecsAlertsData[cellData.rowIndex]} />
          </>
        ),
      },
    ],
    [onOpenFlyout]
  );

  const renderCellValue = (cellData) => {
    const { alert, columnId } = cellData;
    if (columnId === RELATED_INTEGRATION) {
      return <KibanaAlertRelatedIntegrationCellRenderer value={alert[columnId]} />;
    }

    if (columnId === SEVERITY) {
      return <KibanaAlertSeverityCellRenderer value={alert[columnId]} />;
    }

    const value = alert[columnId];
    const displayValue: string = Array.isArray(value) ? value[0] : value;
    return <>{displayValue}</>;
  };

  const renderAdditionalToolbarControls = () => (
    <RenderAdditionalToolbarControls dataView={dataView} />
  );

  const getBulkActions = useMemo(() => getBulkActionsByTableType(), []);

  return (
    <>
      {showUnifiedComponents ? (
        <UnifiedDataTable
          ariaLabelledBy=""
          columns={COLUMN_IDS}
          configRowHeight={2}
          customGridColumnsConfiguration={customGridColumnsConfiguration}
          dataView={dataView}
          expandedDoc={expandedDoc}
          externalCustomRenderers={externalCustomRenderers}
          isSortEnabled={false}
          loadingState={loadingState}
          onSetColumns={onSetColumns}
          onUpdateRowsPerPage={onUpdateRowsPerPage}
          renderDocumentView={EmptyComponent}
          rowAdditionalLeadingControls={rowAdditionalLeadingControls}
          rows={rows}
          rowsPerPageOptions={rowsPerPageOptions}
          rowsPerPageState={rowsPerPage}
          showTimeCol={showTimeCol}
          sort={[]}
          sampleSizeState={SAMPLE_SIZE}
          services={services}
          setExpandedDoc={onSetExpandedDoc}
          showFullScreenButton={false}
          showKeyboardShortcuts={false}
          totalHits={totalCount}
        />
      ) : (
        <AlertsTable
          browserFields={browserFields}
          columns={columns}
          consumers={ALERT_TABLE_CONSUMERS}
          getBulkActions={getBulkActions}
          id={TableId.alertsOnAlertSummaryPage}
          leadingControlColumns={leadingControlColumns}
          query={finalBoolQuery}
          renderAdditionalToolbarControls={renderAdditionalToolbarControls}
          // renderActionsCell={ActionsCellComponent}
          renderCellValue={renderCellValue}
          ruleTypeIds={RULE_TYPE_IDS}
          services={services2}
        />
      )}
    </>
  );
});

Table.displayName = 'Table';
