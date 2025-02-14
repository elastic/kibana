/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldBrowserOptions } from '@kbn/response-ops-alerts-fields-browser';
import type { EuiDataGridCellValueElementProps, EuiDataGridControlColumn } from '@elastic/eui';
import type { ComponentType } from 'react';
import React from 'react';
import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import { addBuildingBlockStyle, getPageRowIndex } from '@kbn/securitysolution-data-table';
import type { SortColumnTable } from '@kbn/securitysolution-data-table';
import type {
  BrowserFields,
  TimelineItem,
  TimelineNonEcsData,
} from '../../../../common/search_strategy';
import type {
  SetEventsDeleted,
  SetEventsLoading,
  ColumnHeaderOptions,
  ControlColumnProps,
  OnRowSelected,
  OnSelectAll,
} from '../../../../common/types';
import { RowAction } from './row_action';

const EmptyHeaderCellRender: ComponentType = () => null;

export interface TransformColumnsProps {
  columnHeaders: ColumnHeaderOptions[];
  controlColumns: ControlColumnProps[];
  data: TimelineItem[];
  fieldBrowserOptions?: FieldBrowserOptions;
  loadingEventIds: string[];
  onRowSelected: OnRowSelected;
  onRuleChange?: () => void;
  selectedEventIds: Record<string, TimelineNonEcsData[]>;
  showCheckboxes: boolean;
  tabType: string;
  timelineId: string;
  isSelectAllChecked: boolean;
  browserFields: BrowserFields;
  onSelectPage: OnSelectAll;
  pageSize: number;
  sort: SortColumnTable[];
  theme: EuiTheme;
  setEventsLoading: SetEventsLoading;
  setEventsDeleted: SetEventsDeleted;
}

export const transformControlColumns = ({
  columnHeaders,
  controlColumns,
  data,
  fieldBrowserOptions,
  loadingEventIds,
  onRowSelected,
  onRuleChange,
  selectedEventIds,
  showCheckboxes,
  tabType,
  timelineId,
  isSelectAllChecked,
  onSelectPage,
  browserFields,
  pageSize,
  sort,
  theme,
  setEventsLoading,
  setEventsDeleted,
}: TransformColumnsProps): EuiDataGridControlColumn[] => {
  return controlColumns.map(
    ({ id: columnId, headerCellRender = EmptyHeaderCellRender, rowCellRender, width }, i) => ({
      id: `${columnId}`,
      headerCellRender: () => {
        const HeaderActions = headerCellRender;
        return (
          <>
            {HeaderActions && (
              <HeaderActions
                width={width}
                browserFields={browserFields}
                fieldBrowserOptions={fieldBrowserOptions}
                columnHeaders={columnHeaders}
                isEventViewer={false}
                isSelectAllChecked={isSelectAllChecked}
                onSelectAll={onSelectPage}
                showEventsSelect={false}
                showSelectAllCheckbox={showCheckboxes}
                sort={sort}
                tabType={tabType}
                timelineId={timelineId}
              />
            )}
          </>
        );
      },
      rowCellRender: ({
        isDetails,
        isExpandable,
        isExpanded,
        rowIndex,
        colIndex,
        setCellProps,
      }: EuiDataGridCellValueElementProps) => {
        const pageRowIndex = getPageRowIndex(rowIndex, pageSize);
        const rowData = data[pageRowIndex];

        if (rowData) {
          addBuildingBlockStyle(rowData.ecs, theme, setCellProps);
        } else {
          // disable the cell when it has no data
          setCellProps({ style: { display: 'none' } });
        }

        return (
          <RowAction
            columnId={columnId ?? ''}
            columnHeaders={columnHeaders}
            controlColumn={controlColumns[i]}
            data={data[pageRowIndex]}
            disabled={false}
            index={i}
            isDetails={isDetails}
            isExpanded={isExpanded}
            isEventViewer={false}
            isExpandable={isExpandable}
            loadingEventIds={loadingEventIds}
            onRowSelected={onRowSelected}
            onRuleChange={onRuleChange}
            rowIndex={rowIndex}
            colIndex={colIndex}
            pageRowIndex={pageRowIndex}
            selectedEventIds={selectedEventIds}
            setCellProps={setCellProps}
            showCheckboxes={showCheckboxes}
            tabType={tabType}
            tableId={timelineId}
            width={width}
            setEventsLoading={setEventsLoading}
            setEventsDeleted={setEventsDeleted}
          />
        );
      },
      width,
    })
  );
};
