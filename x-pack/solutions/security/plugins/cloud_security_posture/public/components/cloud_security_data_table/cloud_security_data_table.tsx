/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo } from 'react';
import _ from 'lodash';
import {
  DataGridDensity,
  UnifiedDataTableSettings,
  UnifiedDataTableSettingsColumn,
  useColumns,
} from '@kbn/unified-data-table';
import { UnifiedDataTable, DataLoadingState } from '@kbn/unified-data-table';
import { CellActionsProvider } from '@kbn/cell-actions';
import { HttpSetup } from '@kbn/core-http-browser';
import { SHOW_MULTIFIELDS, SORT_DEFAULT_ORDER_SETTING } from '@kbn/discover-utils';
import { DataTableRecord } from '@kbn/discover-utils/types';
import {
  EuiDataGridCellValueElementProps,
  EuiDataGridControlColumn,
  EuiDataGridStyle,
  EuiProgress,
} from '@elastic/eui';
import { AddFieldFilterHandler } from '@kbn/unified-field-list';
import { generateFilters } from '@kbn/data-plugin/public';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { MAX_FINDINGS_TO_LOAD } from '@kbn/cloud-security-posture-common';
import { useKibana } from '../../common/hooks/use_kibana';
import { CloudPostureDataTableResult } from '../../common/hooks/use_cloud_posture_data_table';
import { EmptyState } from '../empty_state';
import { useStyles } from './use_styles';
import { AdditionalControls } from './additional_controls';
import { useDataViewContext } from '../../common/contexts/data_view_context';
import { TakeAction } from '../take_action';

import { RuleResponse } from '../../common/types';
export interface CloudSecurityDefaultColumn {
  id: string;
  width?: number;
}

const gridStyle: EuiDataGridStyle = {
  border: 'horizontal',
  cellPadding: 'l',
  stripes: false,
  header: 'underline',
};

const useNewFieldsApi = true;

// Hide Checkbox, enable open details Flyout
const controlColumnIds = ['openDetails'];

export interface CloudSecurityDataTableProps {
  isLoading: boolean;
  defaultColumns: CloudSecurityDefaultColumn[];
  rows: DataTableRecord[];
  total: number;
  /**
   * This is the component that will be rendered in the flyout when a row is expanded.
   * This component will receive the row data and a function to close the flyout.
   */
  flyoutComponent: (hit: DataTableRecord, onCloseFlyout: () => void) => JSX.Element;
  /**
   * This is the object that contains all the data and functions from the useCloudPostureDataTable hook.
   * This is also used to manage the table state from the parent component.
   */
  cloudPostureDataTable: CloudPostureDataTableResult;
  title: string;
  /**
   * This is a function that returns a map of column ids to custom cell renderers.
   * This is useful for rendering custom components for cells in the table.
   */
  customCellRenderer?: (rows: DataTableRecord[]) => {
    [key: string]: (props: EuiDataGridCellValueElementProps) => JSX.Element;
  };
  /**
   * Function to load more rows once the max number of rows has been reached.
   */
  loadMore: () => void;
  'data-test-subj'?: string;
  /**
   * This is the component that will be rendered in the group selector.
   * This component will receive the current group and a function to change the group.
   */
  groupSelectorComponent?: JSX.Element;
  /**
   * Height override for the data grid.
   */
  height?: number | string;

  /**
   * This function will be used in the control column to create a rule for a specific finding.
   */
  createRuleFn?: (rowIndex: number) => ((http: HttpSetup) => Promise<RuleResponse>) | undefined;
  /* Optional props passed to Columns to display Provided Labels as Column name instead of field name */
  columnHeaders?: Record<string, string>;
  /**
   * Specify if distribution bar is shown on data table, used to calculate height of data table in virtualized mode
   */
  hasDistributionBar?: boolean;
}

export const CloudSecurityDataTable = ({
  isLoading,
  defaultColumns,
  rows,
  total,
  flyoutComponent,
  cloudPostureDataTable,
  loadMore,
  title,
  customCellRenderer,
  groupSelectorComponent,
  height,
  createRuleFn,
  columnHeaders,
  hasDistributionBar = true,
  ...rest
}: CloudSecurityDataTableProps) => {
  const {
    columnsLocalStorageKey,
    pageSize,
    onChangeItemsPerPage,
    setUrlQuery,
    onSort,
    onResetFilters,
    filters,
    sort,
  } = cloudPostureDataTable;

  const [columns, setColumns] = useLocalStorage(
    columnsLocalStorageKey,
    defaultColumns.map((c) => c.id)
  );
  const [persistedSettings, setPersistedSettings] = useLocalStorage<UnifiedDataTableSettings>(
    `${columnsLocalStorageKey}:settings`,
    {
      columns: defaultColumns.reduce((columnSettings, column) => {
        const columnDefaultSettings = column.width ? { width: column.width } : {};
        const newColumn = { [column.id]: columnDefaultSettings };
        return { ...columnSettings, ...newColumn };
      }, {} as UnifiedDataTableSettings['columns']),
    }
  );

  const settings = useMemo(() => {
    return {
      columns: Object.keys(persistedSettings?.columns as UnifiedDataTableSettings).reduce(
        (columnSettings, columnId) => {
          const newColumn: UnifiedDataTableSettingsColumn = {
            ..._.pick(persistedSettings?.columns?.[columnId], ['width']),
            display: columnHeaders?.[columnId],
          };

          return { ...columnSettings, [columnId]: newColumn };
        },
        {} as UnifiedDataTableSettings['columns']
      ),
    };
  }, [persistedSettings, columnHeaders]);

  const { dataView, dataViewIsRefetching } = useDataViewContext();

  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);

  const renderDocumentView = (hit: DataTableRecord) =>
    flyoutComponent(hit, () => setExpandedDoc(undefined));

  // services needed for unified-data-table package
  const {
    uiSettings,
    uiActions,
    dataViews,
    data,
    application,
    theme,
    fieldFormats,
    toastNotifications,
    storage,
  } = useKibana().services;

  const styles = useStyles();

  const { capabilities } = application;
  const { filterManager } = data.query;

  const services = {
    theme,
    fieldFormats,
    uiSettings,
    toastNotifications,
    storage,
    data,
  };

  const {
    columns: currentColumns,
    onSetColumns,
    onAddColumn,
    onRemoveColumn,
  } = useColumns({
    capabilities,
    defaultOrder: uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
    dataView,
    dataViews,
    setAppState: (props) => setColumns(props.columns),
    useNewFieldsApi,
    columns,
    sort,
  });

  /**
   * This object is used to determine if the table rendering will be virtualized and the virtualization wrapper height.
   * mode should be passed as a key to the UnifiedDataTable component to force a re-render when the mode changes.
   */
  const computeDataTableRendering = useMemo(() => {
    // Enable virtualization mode when the table is set to a large page size.
    const isVirtualizationEnabled = pageSize >= 100;

    const getWrapperHeight = () => {
      if (height) return height;

      // If virtualization is not needed the table will render unconstrained.
      if (!isVirtualizationEnabled) return 'auto';

      const baseHeight = 362; // height of Kibana Header + Findings page header and search bar
      const filterBarHeight = filters?.length > 0 ? 40 : 0;
      const distributionBarHeight = hasDistributionBar ? 52 : 0;
      return `calc(100vh - ${baseHeight}px - ${filterBarHeight}px - ${distributionBarHeight}px)`;
    };

    return {
      wrapperHeight: getWrapperHeight(),
      mode: isVirtualizationEnabled ? 'virtualized' : 'standard',
    };
  }, [pageSize, height, filters?.length, hasDistributionBar]);

  const onAddFilter: AddFieldFilterHandler | undefined = useMemo(
    () =>
      filterManager && dataView
        ? (clickedField, values, operation) => {
            const newFilters = generateFilters(
              filterManager,
              clickedField,
              values,
              operation,
              dataView
            );
            filterManager.addFilters(newFilters);
            setUrlQuery({
              filters: filterManager.getFilters(),
            });
          }
        : undefined,
    [dataView, filterManager, setUrlQuery]
  );

  const onResize = (colSettings: { columnId: string; width: number | undefined }) => {
    const grid = persistedSettings || {};
    const newColumns = { ...(grid.columns || {}) };
    newColumns[colSettings.columnId] = colSettings.width
      ? { width: Math.round(colSettings.width) }
      : {};
    const newGrid = { ...grid, columns: newColumns };
    setPersistedSettings(newGrid);
  };

  const externalCustomRenderers = useMemo(() => {
    if (!customCellRenderer) {
      return undefined;
    }
    return customCellRenderer(rows);
  }, [customCellRenderer, rows]);

  const onResetColumns = () => {
    setColumns(defaultColumns.map((c) => c.id));
  };

  if (!isLoading && !rows.length) {
    return <EmptyState onResetFilters={onResetFilters} />;
  }

  const externalAdditionalControls = (
    <AdditionalControls
      total={total}
      dataView={dataView}
      title={title}
      columns={currentColumns}
      onAddColumn={onAddColumn}
      onRemoveColumn={onRemoveColumn}
      groupSelectorComponent={groupSelectorComponent}
      onResetColumns={onResetColumns}
    />
  );

  const externalControlColumns: EuiDataGridControlColumn[] | undefined = createRuleFn
    ? [
        {
          id: 'select',
          width: 20,
          headerCellRender: () => null,
          rowCellRender: ({ rowIndex }) =>
            createRuleFn && (
              <TakeAction isDataGridControlColumn createRuleFn={createRuleFn(rowIndex)} />
            ),
        },
      ]
    : undefined;

  const rowHeightState = 0;

  const loadingStyle = {
    opacity: isLoading ? 1 : 0,
  };

  const loadingState =
    isLoading || dataViewIsRefetching ? DataLoadingState.loading : DataLoadingState.loaded;

  return (
    <CellActionsProvider getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}>
      <div
        data-test-subj={rest['data-test-subj']}
        className={styles.gridContainer}
        style={{
          height: computeDataTableRendering.wrapperHeight,
        }}
      >
        <EuiProgress size="xs" color="accent" style={loadingStyle} />
        <UnifiedDataTable
          key={computeDataTableRendering.mode}
          className={styles.gridStyle}
          ariaLabelledBy={title}
          columns={currentColumns}
          expandedDoc={expandedDoc}
          dataView={dataView}
          loadingState={loadingState}
          onFilter={onAddFilter as DocViewFilterFn}
          onResize={onResize}
          onSetColumns={onSetColumns}
          onSort={onSort}
          rows={rows}
          sampleSizeState={MAX_FINDINGS_TO_LOAD}
          setExpandedDoc={setExpandedDoc}
          renderDocumentView={renderDocumentView}
          sort={sort}
          rowsPerPageState={pageSize}
          totalHits={total}
          services={services}
          useNewFieldsApi
          onUpdateRowsPerPage={onChangeItemsPerPage}
          rowHeightState={rowHeightState}
          showMultiFields={uiSettings.get(SHOW_MULTIFIELDS)}
          showTimeCol={false}
          settings={settings}
          onFetchMoreRecords={loadMore}
          externalControlColumns={externalControlColumns}
          externalCustomRenderers={externalCustomRenderers}
          externalAdditionalControls={externalAdditionalControls}
          gridStyleOverride={gridStyle}
          rowLineHeightOverride="24px"
          controlColumnIds={controlColumnIds}
          dataGridDensityState={DataGridDensity.EXPANDED}
        />
      </div>
    </CellActionsProvider>
  );
};
