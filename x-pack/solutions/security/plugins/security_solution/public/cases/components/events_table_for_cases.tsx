/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlat } from '@elastic/ecs';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui/src/components/datagrid/data_grid_types';
import type { CaseViewEventsTableProps } from '@kbn/cases-plugin/common/ui';
import type { EuiTheme } from '@kbn/react-kibana-context-styled';
import {
  defaultColumnHeaderType,
  getPageRowIndex,
  addBuildingBlockStyle,
  defaultHeaders,
  DataTableComponent,
  dataTableActions,
} from '@kbn/securitysolution-data-table';
import type { EcsSecurityExtension } from '@kbn/securitysolution-ecs';
import type { TimelineItem, DeprecatedRowRenderer } from '@kbn/timelines-plugin/common';
import React, { useMemo, useEffect, useContext } from 'react';
import { useDispatch } from 'react-redux';
// eslint-disable-next-line @kbn/eslint/module_migration
import { ThemeContext } from 'styled-components';
import { SecurityCellActionsTrigger } from '../../app/actions/constants';
import { RowAction } from '../../common/components/control_columns/row_action';
import { buildBrowserFields } from '../../data_view_manager/utils/security_browser_fields_manager';
import { getDefaultControlColumn } from '../../timelines/components/timeline/body/control_columns';
import { defaultRowRenderers } from '../../timelines/components/timeline/body/renderers';
import { DefaultCellRenderer } from '../../timelines/components/timeline/cell_rendering/default_cell_renderer';

export const EVENTS_TABLE_FOR_CASES_ID = 'EVENTS_TABLE_FOR_CASES_ID' as const;

const noop = () => {};
export const emptyArray = {} as const;

export const MAX_ACTION_BUTTON_COUNT = 4;

export const EventsTableForCases = (props: CaseViewEventsTableProps) => {
  const dispatch = useDispatch();

  const browserFields = useMemo(() => {
    return buildBrowserFields(props.dataView.fields).browserFields;
  }, [props.dataView.fields]);

  const data = useMemo((): TimelineItem[] => {
    return props.data.map((row) => ({
      _id: row.raw._id as string,
      _index: row.raw._index as string,
      ecs: {
        ...EcsFlat,
        _id: row.raw._id as string,
        _index: row.raw._index as string,
      } as unknown as EcsSecurityExtension,
      data: [
        ...Object.entries(row.raw.fields ?? {}).map(([field, value]) => ({ field, value })),
        { field: '_id', value: [row.raw._id] },
      ],
    }));
  }, [props.data]);

  useEffect(() => {
    dispatch(
      dataTableActions.createDataTable({
        indexNames: props.dataView.getIndexPattern().split(','),
        columns: [{ id: '_id', columnHeaderType: defaultColumnHeaderType }],
        defaultColumns: [],
        sort: [],
        id: EVENTS_TABLE_FOR_CASES_ID,
      })
    );
  }, [dispatch, props.dataView]);

  const controlColumns = getDefaultControlColumn(MAX_ACTION_BUTTON_COUNT);

  const theme: EuiTheme = useContext(ThemeContext);

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
          const pageRowIndex = getPageRowIndex(rowIndex, 10);
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
              loadingEventIds={[]}
              onRowSelected={noop}
              onRuleChange={noop}
              pageRowIndex={pageRowIndex}
              selectedEventIds={emptyArray}
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
    [controlColumns, data, theme]
  );

  return (
    <DataTableComponent
      browserFields={browserFields}
      data={data}
      getFieldSpec={(fieldName: string) => props.dataView.fields.getByName(fieldName)?.toSpec()}
      id={EVENTS_TABLE_FOR_CASES_ID}
      totalItems={props.data.length}
      unitCountText="events"
      cellActionsTriggerId={SecurityCellActionsTrigger.CASE_EVENTS}
      leadingControlColumns={leadingControlColumns}
      loadPage={noop}
      pagination={{
        pageIndex: 0,
        pageSize: 10,
        // TODO: add handlers
        onChangeItemsPerPage: noop,
        onChangePage: noop,
      }}
      renderCellValue={DefaultCellRenderer}
      rowRenderers={defaultRowRenderers as unknown as DeprecatedRowRenderer[]}
    />
  );
};
