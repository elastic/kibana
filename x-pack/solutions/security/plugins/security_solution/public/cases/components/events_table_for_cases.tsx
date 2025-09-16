/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiDataGridCellValueElementProps,
  EuiDataGridPaginationProps,
} from '@elastic/eui/src/components/datagrid/data_grid_types';
import type { CaseViewEventsTableProps } from '@kbn/cases-plugin/common/ui';
import type { EuiTheme } from '@kbn/react-kibana-context-styled';
import type { SubsetDataTableModel } from '@kbn/securitysolution-data-table';
import { type DataView } from '@kbn/data-views-plugin/public';
import {
  getPageRowIndex,
  addBuildingBlockStyle,
  defaultHeaders,
  DataTableComponent,
  dataTableActions,
  getTableByIdSelector,
  tableDefaults,
} from '@kbn/securitysolution-data-table';
import type { DeprecatedRowRenderer } from '@kbn/timelines-plugin/common';
import React, { useMemo, useEffect, useContext, type FC } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeContext } from 'styled-components';
import { SecurityCellActionsTrigger } from '../../app/actions/constants';
import { RowAction } from '../../common/components/control_columns/row_action';
import { buildBrowserFields } from '../../data_view_manager/utils/security_browser_fields_manager';
import { getDefaultControlColumn } from '../../timelines/components/timeline/body/control_columns';
import { defaultRowRenderers } from '../../timelines/components/timeline/body/renderers';
import { DefaultCellRenderer } from '../../timelines/components/timeline/cell_rendering/default_cell_renderer';
import type { State } from '../../common/store/types';
import { useGetEvents } from './use_get_events';
import { useCaseEventsDataView } from './use_events_data_view';

export const EVENTS_TABLE_FOR_CASES_ID = 'EVENTS_TABLE_FOR_CASES_ID' as const;

const noop = () => {};
export const emptyObject = {} as const;
export const emptyArray = [];

export const MAX_ACTION_BUTTON_COUNT = 4;

const defaultModel: SubsetDataTableModel = structuredClone(tableDefaults);

export const EventsTableForCasesBody: FC<{ dataView: DataView } & CaseViewEventsTableProps> = ({
  dataView,
  events,
}) => {
  const selectTableById = useMemo(() => getTableByIdSelector(), []);

  const { defaultColumns, columns, loadingEventIds, itemsPerPage, itemsPerPageOptions, sort } =
    useSelector(
      (state: State) => selectTableById(state, EVENTS_TABLE_FOR_CASES_ID) ?? defaultModel
    );

  const { data = [] } = useGetEvents(dataView, {
    eventIds: events.flatMap((event) =>
      Array.isArray(event.eventId) ? event.eventId : [event.eventId]
    ),
    columns: ['*'],
    sort,
  });

  const dispatch = useDispatch();

  const browserFields = useMemo(() => {
    return buildBrowserFields(dataView.fields).browserFields;
  }, [dataView.fields]);

  const controlColumns = useMemo(() => getDefaultControlColumn(MAX_ACTION_BUTTON_COUNT), []);

  useEffect(() => {
    dispatch(
      dataTableActions.createDataTable({
        indexNames: dataView.getIndexPattern().split(','),
        columns,
        defaultColumns,
        sort,
        id: EVENTS_TABLE_FOR_CASES_ID,
      })
    );
  }, [columns, defaultColumns, dispatch, dataView, sort]);

  const theme: EuiTheme = useContext(ThemeContext);

  const pagination: EuiDataGridPaginationProps & { pageSize: number } = useMemo(
    () => ({
      pageIndex: 0,
      pageSize: itemsPerPage,
      pageSizeOptions: itemsPerPageOptions,
      onChangeItemsPerPage: (perPage) => {},
      onChangePage: (pageIndex) => {},
    }),
    [itemsPerPage, itemsPerPageOptions]
  );

  const leadingControlColumns = useMemo(
    () =>
      getDefaultControlColumn(MAX_ACTION_BUTTON_COUNT).map((column, i) => ({
        ...column,
        headerCellRender: () => null,
        rowCellRender: ({
          isDetails,
          isExpandable,
          isExpanded,
          rowIndex,
          colIndex,
          setCellProps,
        }: EuiDataGridCellValueElementProps) => {
          const pageRowIndex = getPageRowIndex(rowIndex, itemsPerPage);
          const rowData = data[pageRowIndex];

          if (rowData) {
            addBuildingBlockStyle(rowData.ecs, theme, setCellProps);
          } else {
            // disable the cell when it has no data
            setCellProps({ style: { display: 'none' } });
          }

          return (
            <RowAction
              columnId={column.id ?? ''}
              columnHeaders={defaultHeaders}
              controlColumn={controlColumns[i]}
              data={rowData}
              disabled={false}
              index={i}
              rowIndex={rowIndex}
              colIndex={colIndex}
              isDetails={isDetails}
              isExpanded={isExpanded}
              isEventViewer={false}
              isExpandable={isExpandable}
              loadingEventIds={loadingEventIds}
              onRowSelected={noop}
              onRuleChange={noop}
              pageRowIndex={pageRowIndex}
              selectedEventIds={emptyObject}
              setCellProps={setCellProps}
              showCheckboxes={false}
              tableId={EVENTS_TABLE_FOR_CASES_ID}
              width={100}
              setEventsLoading={noop}
              setEventsDeleted={noop}
            />
          );
        },
      })),
    [controlColumns, data, itemsPerPage, loadingEventIds, theme]
  );

  return (
    <DataTableComponent
      browserFields={browserFields}
      data={data}
      getFieldSpec={(fieldName: string) => dataView.fields.getByName(fieldName)?.toSpec()}
      id={EVENTS_TABLE_FOR_CASES_ID}
      totalItems={data.length}
      unitCountText="events"
      cellActionsTriggerId={SecurityCellActionsTrigger.CASE_EVENTS}
      leadingControlColumns={leadingControlColumns}
      loadPage={noop}
      pagination={pagination}
      renderCellValue={DefaultCellRenderer}
      rowRenderers={defaultRowRenderers as unknown as DeprecatedRowRenderer[]}
    />
  );
};

export const EventsTableForCases = ({ events }: CaseViewEventsTableProps) => {
  const patterns = useMemo(
    () =>
      [
        ...new Set(
          events.flatMap((event) => (Array.isArray(event.index) ? event.index : [event.index]))
        ),
      ].join(),
    [events]
  );

  const { dataView } = useCaseEventsDataView(patterns);

  if (!dataView) {
    return null;
  }

  return <EventsTableForCasesBody dataView={dataView} events={events} />;
};
