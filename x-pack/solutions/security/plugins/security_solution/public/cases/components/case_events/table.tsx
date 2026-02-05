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
import {
  addBuildingBlockStyle,
  dataTableActions,
  DataTableComponent,
  defaultHeaders,
  getPageRowIndex,
  getTableByIdSelector,
  tableDefaults,
} from '@kbn/securitysolution-data-table';
import { type DataView } from '@kbn/data-views-plugin/public';
import type { DeprecatedRowRenderer } from '@kbn/timelines-plugin/common';
import React, { type FC, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { ThemeContext } from 'styled-components';
import { EuiEmptyPrompt, EuiProgress } from '@elastic/eui';
import { SECURITY_CELL_ACTIONS_CASE_EVENTS } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { RowAction } from '../../../common/components/control_columns/row_action';
import { buildBrowserFields } from '../../../data_view_manager/utils/build_browser_fields';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import { DefaultCellRenderer } from '../../../timelines/components/timeline/cell_rendering/default_cell_renderer';
import type { State } from '../../../common/store/types';
import { useGetEvents } from './use_get_events';
import { useCaseEventsDataView } from './use_events_data_view';
import { TABLE_UNIT, NO_EVENTS_TITLE } from './translations';

export const EVENTS_TABLE_FOR_CASES_ID = 'EVENTS_TABLE_FOR_CASES_ID' as const;
export const EMPTY_EVENTS_TABLE_FOR_CASES_ID = `EMPTY_${EVENTS_TABLE_FOR_CASES_ID}` as const;
export const LOADING_EVENTS_TABLE_FOR_CASES_ID = `LOADING_${EVENTS_TABLE_FOR_CASES_ID}` as const;

const noop = () => {};
const emptyObject = {} as const;

const MAX_ACTION_BUTTON_COUNT = 4;
const DEFAULT_MODEL: SubsetDataTableModel = structuredClone(tableDefaults);

const EventsTableForCasesBody: FC<{ dataView: DataView } & CaseViewEventsTableProps> = ({
  dataView,
  events,
}) => {
  const selectTableById = useMemo(() => getTableByIdSelector(), []);

  const { defaultColumns, columns, loadingEventIds, itemsPerPage, itemsPerPageOptions, sort } =
    useSelector(
      (state: State) => selectTableById(state, EVENTS_TABLE_FOR_CASES_ID) ?? DEFAULT_MODEL
    );

  const dispatch = useDispatch();

  const browserFields = useMemo(() => buildBrowserFields(dataView.fields), [dataView.fields]);

  const controlColumns = useMemo(() => getDefaultControlColumn(MAX_ACTION_BUTTON_COUNT), []);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);

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
      pageIndex: currentPageIndex,
      pageSize: itemsPerPage,
      pageSizeOptions: itemsPerPageOptions,
      onChangeItemsPerPage: (perPage) =>
        dispatch(
          dataTableActions.updateItemsPerPage({
            id: EVENTS_TABLE_FOR_CASES_ID,
            itemsPerPage: perPage,
          })
        ),
      onChangePage: setCurrentPageIndex,
    }),
    [currentPageIndex, dispatch, itemsPerPage, itemsPerPageOptions]
  );

  const eventIds = useMemo(() => {
    return events.flatMap((event) =>
      Array.isArray(event.eventId) ? event.eventId : [event.eventId]
    );
  }, [events]);

  const { data = [], isFetching: isFetchingEvents } = useGetEvents(dataView, {
    eventIds,
    sort,
    pageIndex: currentPageIndex,
    itemsPerPage,
  });

  // NOTE: sorting change resets pagination
  useEffect(() => {
    setCurrentPageIndex(0);
  }, [sort]);

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
              key={column.id}
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

  const getFieldSpec = useCallback(
    (fieldName: string) => dataView.fields.getByName(fieldName)?.toSpec(),
    [dataView.fields]
  );

  if (isFetchingEvents) {
    return (
      <EuiProgress size="xs" color="accent" data-test-subj={LOADING_EVENTS_TABLE_FOR_CASES_ID} />
    );
  }

  if (!data.length) {
    return (
      <EuiEmptyPrompt
        data-test-subj={EMPTY_EVENTS_TABLE_FOR_CASES_ID}
        title={<h2>{NO_EVENTS_TITLE}</h2>}
      />
    );
  }

  return (
    <DataTableComponent
      browserFields={browserFields}
      data={data}
      getFieldSpec={getFieldSpec}
      id={EVENTS_TABLE_FOR_CASES_ID}
      totalItems={eventIds.length}
      unitCountText={TABLE_UNIT}
      cellActionsTriggerId={SECURITY_CELL_ACTIONS_CASE_EVENTS}
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
