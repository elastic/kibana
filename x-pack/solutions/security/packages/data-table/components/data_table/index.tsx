/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  EuiDataGridControlColumn,
  EuiDataGridPaginationProps,
  EuiDataGridProps,
  EuiDataGridRefProps,
  EuiDataGridRowHeightsOptions,
  EuiDataGridStyle,
  EuiDataGridToolBarVisibilityOptions,
} from '@elastic/eui';
import { EuiDataGrid, EuiProgress } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import React, { useCallback, useContext, useEffect, useMemo, useRef, ComponentType } from 'react';
import { useDispatch } from 'react-redux';

import styled, { ThemeContext } from 'styled-components';
import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import { i18n } from '@kbn/i18n';
import {
  BrowserFields,
  ColumnHeaderOptions,
  DeprecatedCellValueElementProps,
  DeprecatedRowRenderer,
  TimelineItem,
} from '@kbn/timelines-plugin/common';
import {
  useDataGridColumnsCellActions,
  UseDataGridColumnsCellActionsProps,
} from '@kbn/cell-actions';
import { FieldSpec } from '@kbn/data-views-plugin/common';
import { FieldBrowser, type FieldBrowserOptions } from '@kbn/response-ops-alerts-fields-browser';
import { DataTableModel, DataTableState } from '../../store/data_table/types';

import { getColumnHeader, getColumnHeaders } from './column_headers/helpers';
import { addBuildingBlockStyle, mapSortDirectionToDirection, mapSortingColumns } from './helpers';

import { REMOVE_COLUMN } from './column_headers/translations';
import { dataTableActions, dataTableSelectors } from '../../store/data_table';
import type { BulkActionsProp } from '../toolbar/bulk_actions/types';
import { getPageRowIndex } from './pagination';
import { UnitCount } from '../toolbar/unit';
import { useShallowEqualSelector } from '../../hooks/use_selector';
import { tableDefaults } from '../../store/data_table/defaults';

const DATA_TABLE_ARIA_LABEL = i18n.translate('securitySolutionPackages.dataTable.ariaLabel', {
  defaultMessage: 'Alerts',
});

type NonCustomizableGridProps =
  | 'id'
  | 'data-test-subj'
  | 'aria-label'
  | 'aria-labelledby'
  | 'columns'
  | 'columnVisibility'
  | 'gridStyle'
  | 'leadingControlColumns'
  | 'toolbarVisibility'
  | 'rowCount'
  | 'renderCellValue'
  | 'sorting'
  | 'onColumnResize'
  | 'pagination'
  | 'rowHeightsOptions';

interface BaseDataTableProps {
  additionalControls?: React.ReactNode;
  browserFields: BrowserFields;
  bulkActions?: BulkActionsProp;
  data: TimelineItem[];
  fieldBrowserOptions?: FieldBrowserOptions;
  id: string;
  leadingControlColumns: EuiDataGridControlColumn[];
  loadPage: (newActivePage: number) => void;
  renderCellValue: (props: DeprecatedCellValueElementProps) => React.ReactNode;
  rowRenderers: DeprecatedRowRenderer[];
  unitCountText: string;
  pagination: EuiDataGridPaginationProps & { pageSize: number };
  totalItems: number;
  rowHeightsOptions?: EuiDataGridRowHeightsOptions;
  isEventRenderedView?: boolean;
  fieldsBrowserComponent?: ComponentType;
  getFieldSpec: (fieldName: string) => FieldSpec | undefined;
  cellActionsTriggerId?: string;
}

export type DataTableProps = BaseDataTableProps & Omit<EuiDataGridProps, NonCustomizableGridProps>;

const ES_LIMIT_COUNT = 9999;

const gridStyle: EuiDataGridStyle = {
  border: 'none',
  fontSize: 's',
  header: 'underline',
};

const EuiDataGridContainer = styled.div<{ hideLastPage: boolean }>`
  ul.euiPagination__list {
    li.euiPagination__item:last-child {
      ${({ hideLastPage }) => `${hideLastPage ? 'display:none' : ''}`};
    }
  }

  div .euiDataGridRowCell {
    display: flex;
    align-items: center;
  }

  div .euiDataGridRowCell > [data-focus-lock-disabled] {
    display: flex;
    align-items: center;
    flex-grow: 1;
    width: 100%;
  }

  div .euiDataGridRowCell__content {
    flex-grow: 1;
  }

  div .siemEventsTable__trSupplement--summary {
    display: block;
  }
`;

const memoizedGetColumnHeaders: (
  headers: ColumnHeaderOptions[],
  browserFields: BrowserFields
) => ColumnHeaderOptions[] = memoizeOne(getColumnHeaders);

// eslint-disable-next-line react/display-name
export const DataTableComponent = React.memo<DataTableProps>(
  ({
    additionalControls,
    browserFields,
    bulkActions = true,
    data,
    fieldBrowserOptions,
    id,
    leadingControlColumns,
    loadPage,
    renderCellValue,
    rowRenderers,
    pagination,
    unitCountText,
    totalItems,
    rowHeightsOptions,
    isEventRenderedView = false,
    fieldsBrowserComponent = FieldBrowser,
    getFieldSpec,
    cellActionsTriggerId,
    ...otherProps
  }) => {
    const getDataTable = dataTableSelectors.getTableByIdSelector();
    const dataTable = useShallowEqualSelector<DataTableModel, DataTableState>(
      (state) => getDataTable(state, id) ?? tableDefaults
    );
    const {
      columns,
      selectedEventIds,
      showCheckboxes,
      sort,
      isLoading,
      defaultColumns,
      dataViewId,
    } = dataTable;
    const FieldsBrowserComponent = fieldsBrowserComponent;

    const columnHeaders = memoizedGetColumnHeaders(columns, browserFields);

    const dataGridRef = useRef<EuiDataGridRefProps>(null);

    const dispatch = useDispatch();

    const selectedCount = useMemo(() => Object.keys(selectedEventIds).length, [selectedEventIds]);

    const theme: EuiTheme = useContext(ThemeContext);

    const showBulkActions = useMemo(() => {
      if (selectedCount === 0 || !showCheckboxes) {
        return false;
      }
      if (typeof bulkActions === 'boolean') {
        return bulkActions;
      }
      return (bulkActions?.customBulkActions?.length || bulkActions?.alertStatusActions) ?? true;
    }, [selectedCount, showCheckboxes, bulkActions]);

    const onResetColumns = useCallback(() => {
      dispatch(dataTableActions.updateColumns({ id, columns: defaultColumns }));
    }, [defaultColumns, dispatch, id]);

    const onToggleColumn = useCallback(
      (columnId: string) => {
        if (columnHeaders.some(({ id: columnHeaderId }) => columnId === columnHeaderId)) {
          dispatch(
            dataTableActions.removeColumn({
              columnId,
              id,
            })
          );
        } else {
          dispatch(
            dataTableActions.upsertColumn({
              column: getColumnHeader(columnId, defaultColumns),
              id,
              index: 1,
            })
          );
        }
      },
      [columnHeaders, dispatch, id, defaultColumns]
    );

    const toolbarVisibility: EuiDataGridToolBarVisibilityOptions = useMemo(
      () => ({
        additionalControls: {
          left: {
            append: (
              <>
                {isLoading && <EuiProgress size="xs" position="absolute" color="accent" />}
                <UnitCount data-test-subj="server-side-event-count">{unitCountText}</UnitCount>
                {additionalControls ?? null}
                <FieldsBrowserComponent
                  browserFields={browserFields}
                  options={fieldBrowserOptions}
                  columnIds={columnHeaders.map(({ id: columnId }) => columnId)}
                  onResetColumns={onResetColumns}
                  onToggleColumn={onToggleColumn}
                />
              </>
            ),
          },
        },
        ...(showBulkActions
          ? {
              showColumnSelector: false,
              showSortSelector: false,
              showFullScreenSelector: false,
            }
          : {
              showColumnSelector: { allowHide: false, allowReorder: true },
              showSortSelector: true,
              showFullScreenSelector: true,
            }),
        showDisplaySelector: false,
      }),
      [
        isLoading,
        unitCountText,
        additionalControls,
        FieldsBrowserComponent,
        browserFields,
        fieldBrowserOptions,
        columnHeaders,
        onResetColumns,
        onToggleColumn,
        showBulkActions,
      ]
    );

    const sortingColumns: Array<{
      id: string;
      direction: 'asc' | 'desc';
    }> = useMemo(
      () =>
        sort.map((x) => ({
          id: x.columnId,
          direction: mapSortDirectionToDirection(x.sortDirection),
        })),
      [sort]
    );

    const onSort = useCallback(
      (
        nextSortingColumns: Array<{
          id: string;
          direction: 'asc' | 'desc';
        }>
      ) => {
        dispatch(
          dataTableActions.updateSort({
            id,
            sort: mapSortingColumns({ columns: nextSortingColumns, columnHeaders }),
          })
        );

        setTimeout(() => {
          // schedule the query to be re-executed from page 0, (but only after the
          // store has been updated with the new sort):
          if (loadPage != null) {
            loadPage(0);
          }
        }, 0);
      },
      [columnHeaders, dispatch, id, loadPage]
    );

    const visibleColumns = useMemo(() => columnHeaders.map(({ id: cid }) => cid), [columnHeaders]); // the full set of columns

    const onColumnResize = useCallback(
      ({ columnId, width }: { columnId: string; width: number }) => {
        dispatch(
          dataTableActions.updateColumnWidth({
            columnId,
            id,
            width,
          })
        );
      },
      [dispatch, id]
    );

    const onSetVisibleColumns = useCallback(
      (newVisibleColumns: string[]) => {
        dispatch(
          dataTableActions.updateColumnOrder({
            columnIds: newVisibleColumns,
            id,
          })
        );
      },
      [dispatch, id]
    );

    const cellActionsMetadata = useMemo(() => ({ scopeId: id, dataViewId }), [dataViewId, id]);
    const cellActionsFields = useMemo<UseDataGridColumnsCellActionsProps['fields']>(
      () =>
        cellActionsTriggerId
          ? columnHeaders.map(
              (column) =>
                getFieldSpec(column.id) ?? {
                  name: column.id,
                  type: '', // When type is an empty string all cell actions are incompatible
                  aggregatable: false,
                  searchable: false,
                }
            )
          : undefined,
      [cellActionsTriggerId, columnHeaders, getFieldSpec]
    );

    const getCellValue = useCallback<UseDataGridColumnsCellActionsProps['getCellValue']>(
      (fieldName, rowIndex) => {
        const pageIndex = rowIndex % data.length;
        return data[pageIndex].data.find((rowData) => rowData.field === fieldName)?.value;
      },
      [data]
    );

    const columnsCellActions = useDataGridColumnsCellActions({
      triggerId: cellActionsTriggerId,
      fields: cellActionsFields,
      getCellValue,
      metadata: cellActionsMetadata,
      dataGridRef,
    });

    const columnsWithCellActions: EuiDataGridColumn[] = useMemo(
      () =>
        columnHeaders.map((header, columnIndex) => ({
          ...header,
          actions: {
            ...header.actions,
            additional: [
              {
                iconType: 'cross',
                label: REMOVE_COLUMN,
                onClick: () => {
                  dispatch(dataTableActions.removeColumn({ id, columnId: header.id }));
                },
                size: 'xs',
              },
            ],
          },
          cellActions: columnsCellActions[columnIndex] ?? [],
          visibleCellActions: 3,
        })),
      [columnHeaders, columnsCellActions, dispatch, id]
    );

    const renderTableCellValue = useMemo(() => {
      const Cell: React.FC<EuiDataGridCellValueElementProps> = ({
        columnId,
        rowIndex,
        colIndex,
        setCellProps,
        isDetails,
      }): React.ReactElement | null => {
        const pageRowIndex = getPageRowIndex(rowIndex, pagination.pageSize);
        const rowData = pageRowIndex < data.length ? data[pageRowIndex].data : null;
        const header = columnHeaders.find((h) => h.id === columnId);
        const eventId = pageRowIndex < data.length ? data[pageRowIndex]._id : null;
        const ecs = pageRowIndex < data.length ? data[pageRowIndex].ecs : null;

        useEffect(() => {
          if (ecs && rowData) {
            addBuildingBlockStyle(ecs, theme, setCellProps);
          } else {
            // disable the cell when it has no data
            setCellProps({ style: { display: 'none' } });
          }
        }, [rowIndex, setCellProps, ecs, rowData]);

        if (rowData == null || header == null || eventId == null || ecs === null) {
          return null;
        }

        return renderCellValue({
          asPlainText: false,
          browserFields,
          columnId: header.id,
          data: rowData,
          ecsData: ecs,
          eventId,
          header,
          isDetails,
          isDraggable: false,
          isExpandable: true,
          isExpanded: false,
          linkValues: getOr([], header.linkField ?? '', ecs),
          rowIndex,
          colIndex,
          rowRenderers,
          setCellProps,
          scopeId: id,
          truncate: isDetails ? false : true,
        }) as React.ReactElement;
      };
      return Cell;
    }, [
      browserFields,
      columnHeaders,
      data,
      id,
      pagination.pageSize,
      renderCellValue,
      rowRenderers,
      theme,
    ]);

    return (
      <>
        <EuiDataGridContainer hideLastPage={totalItems > ES_LIMIT_COUNT}>
          <EuiDataGrid
            {...otherProps}
            id={'body-data-grid'}
            data-test-subj="body-data-grid"
            aria-label={DATA_TABLE_ARIA_LABEL}
            columns={columnsWithCellActions}
            columnVisibility={{ visibleColumns, setVisibleColumns: onSetVisibleColumns }}
            gridStyle={gridStyle}
            leadingControlColumns={leadingControlColumns}
            toolbarVisibility={toolbarVisibility}
            rowCount={totalItems}
            renderCellValue={renderTableCellValue}
            sorting={{ columns: sortingColumns, onSort }}
            onColumnResize={onColumnResize}
            pagination={pagination}
            ref={dataGridRef}
            rowHeightsOptions={undefined}
          />
        </EuiDataGridContainer>
      </>
    );
  }
);
