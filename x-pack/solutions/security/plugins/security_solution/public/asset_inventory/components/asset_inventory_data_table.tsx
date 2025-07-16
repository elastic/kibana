/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  UnifiedDataTable,
  DataLoadingState,
  DataGridDensity,
  useColumns,
  type UnifiedDataTableSettings,
  type UnifiedDataTableSettingsColumn,
  type CustomCellRenderer,
} from '@kbn/unified-data-table';
import { CellActionsProvider } from '@kbn/cell-actions';
import { SHOW_MULTIFIELDS, SORT_DEFAULT_ORDER_SETTING } from '@kbn/discover-utils';
import { type DataTableRecord } from '@kbn/discover-utils/types';
import {
  type EuiDataGridCellValueElementProps,
  type EuiDataGridStyle,
  EuiProgress,
} from '@elastic/eui';
import { type AddFieldFilterHandler } from '@kbn/unified-field-list';
import { generateFilters } from '@kbn/data-plugin/public';
import { type DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { EmptyComponent } from '../../common/lib/cell_actions/helpers';
import { type CriticalityLevelWithUnassigned } from '../../../common/entity_analytics/asset_criticality/types';
import { useKibana } from '../../common/lib/kibana';
import { AssetCriticalityBadge } from '../../entity_analytics/components/asset_criticality/asset_criticality_badge';

import { AdditionalControls } from './additional_controls';
import { RiskBadge } from './risk_badge';
import { AssetInventoryEmptyState } from './asset_inventory_empty_state';

import { useDynamicEntityFlyout } from '../hooks/use_dynamic_entity_flyout';
import { useDataViewContext } from '../hooks/data_view_context';
import { useStyles } from '../hooks/use_styles';
import { useFetchGridData } from '../hooks/use_fetch_grid_data';
import type { AssetInventoryURLStateResult } from '../hooks/use_asset_inventory_url_state/use_asset_inventory_url_state';

import {
  ASSET_FIELDS,
  DEFAULT_VISIBLE_ROWS_PER_PAGE,
  MAX_ASSETS_TO_LOAD,
  ASSET_INVENTORY_TABLE_ID,
  TEST_SUBJ_DATA_GRID,
  LOCAL_STORAGE_COLUMNS_SETTINGS_KEY,
  LOCAL_STORAGE_COLUMNS_KEY,
} from '../constants';
import type { GenericEntityRecord } from '../types/generic_entity_record';

const gridStyle: EuiDataGridStyle = {
  border: 'horizontal',
  cellPadding: 'l',
  stripes: false,
  header: 'underline',
};

const title = i18n.translate('xpack.securitySolution.assetInventory.allAssets.tableRowTypeLabel', {
  defaultMessage: 'assets',
});

const columnHeaders: Record<string, string> = {
  [ASSET_FIELDS.ENTITY_NAME]: i18n.translate(
    'xpack.securitySolution.assetInventory.allAssets.name',
    {
      defaultMessage: 'Name',
    }
  ),
  [ASSET_FIELDS.ENTITY_ID]: i18n.translate('xpack.securitySolution.assetInventory.allAssets.id', {
    defaultMessage: 'ID',
  }),
  [ASSET_FIELDS.ENTITY_TYPE]: i18n.translate(
    'xpack.securitySolution.assetInventory.allAssets.type',
    {
      defaultMessage: 'Type',
    }
  ),
  [ASSET_FIELDS.TIMESTAMP]: i18n.translate(
    'xpack.securitySolution.assetInventory.allAssets.lastSeen',
    {
      defaultMessage: 'Last Seen',
    }
  ),
} as const;

const customCellRenderer = (rows: DataTableRecord[]): CustomCellRenderer => ({
  [ASSET_FIELDS.ENTITY_RISK]: ({ rowIndex }: EuiDataGridCellValueElementProps) => {
    const risk = rows[rowIndex].flattened[ASSET_FIELDS.ENTITY_RISK] as number;
    return <RiskBadge risk={risk} />;
  },
  [ASSET_FIELDS.ASSET_CRITICALITY]: ({ rowIndex }: EuiDataGridCellValueElementProps) => {
    const criticality = rows[rowIndex].flattened[ASSET_FIELDS.ASSET_CRITICALITY] as
      | CriticalityLevelWithUnassigned
      | 'deleted';
    return (
      <AssetCriticalityBadge
        criticalityLevel={criticality === 'deleted' ? 'unassigned' : criticality}
      />
    );
  },
});

interface AssetInventoryDefaultColumn {
  id: string;
  width?: number;
}

const defaultColumns: AssetInventoryDefaultColumn[] = [
  { id: ASSET_FIELDS.ENTITY_NAME, width: 400 },
  { id: ASSET_FIELDS.ENTITY_ID },
  { id: ASSET_FIELDS.ENTITY_TYPE },
  { id: ASSET_FIELDS.TIMESTAMP },
];

export interface AssetInventoryDataTableProps {
  state: AssetInventoryURLStateResult;
  height?: number;
  groupSelectorComponent?: JSX.Element;
}

export const AssetInventoryDataTable = ({
  state,
  height,
  groupSelectorComponent,
}: AssetInventoryDataTableProps) => {
  const {
    pageSize,
    sort,
    query,
    queryError,
    getRowsFromPages,
    onChangeItemsPerPage,
    onResetFilters,
    onSort,
    setUrlQuery,
  } = state;

  // Table Flyout Controls -------------------------------------------------------------------

  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);

  const { openDynamicFlyout, closeDynamicFlyout } = useDynamicEntityFlyout({
    onFlyoutClose: () => setExpandedDoc(undefined),
  });

  const openTableFlyout = (doc?: DataTableRecord | undefined) => {
    if (doc && doc.raw._source) {
      const source = doc.raw._source as GenericEntityRecord;
      setExpandedDoc(doc); // Table is expecting the same doc ref to highlight the selected row
      openDynamicFlyout({
        entityDocId: doc.raw._id,
        entityType: source.entity?.EngineMetadata?.Type,
        entityName: source.entity?.name,
        scopeId: ASSET_INVENTORY_TABLE_ID,
        contextId: ASSET_INVENTORY_TABLE_ID,
      });
    } else {
      closeDynamicFlyout();
      setExpandedDoc(undefined);
    }
  };

  // -----------------------------------------------------------------------------------------

  const {
    data: rowsData,
    fetchNextPage: loadMore,
    isFetching: isFetchingGridData,
    isLoading: isLoadingGridData,
  } = useFetchGridData({
    query,
    sort,
    enabled: !queryError,
    pageSize: DEFAULT_VISIBLE_ROWS_PER_PAGE,
  });

  const rows = getRowsFromPages(rowsData?.pages);
  const totalHits = rowsData?.pages[0].total || 0;

  const [localStorageColumns, setLocalStorageColumns] = useLocalStorage(
    LOCAL_STORAGE_COLUMNS_KEY,
    defaultColumns.map((c) => c.id)
  );

  const [persistedSettings, setPersistedSettings] = useLocalStorage<UnifiedDataTableSettings>(
    LOCAL_STORAGE_COLUMNS_SETTINGS_KEY,
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
  }, [persistedSettings]);

  const { dataView, dataViewIsLoading } = useDataViewContext();

  const {
    uiActions,
    uiSettings,
    dataViews,
    data,
    application: { capabilities },
    theme,
    fieldFormats,
    notifications,
    storage,
  } = useKibana().services;
  const { filterManager } = data.query;

  const services = {
    theme,
    fieldFormats,
    uiSettings,
    toastNotifications: notifications.toasts,
    storage,
    data,
  };

  const styles = useStyles();

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
    setAppState: (props) => setLocalStorageColumns(props.columns),
    columns: localStorageColumns,
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
      return `calc(100vh - ${baseHeight}px)`;
    };

    return {
      wrapperHeight: getWrapperHeight(),
      mode: isVirtualizationEnabled ? 'virtualized' : 'standard',
    };
  }, [pageSize, height]);

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

  const externalCustomRenderers = useMemo(() => customCellRenderer(rows), [rows]);

  const onResetColumns = () => {
    setLocalStorageColumns(defaultColumns.map((c) => c.id));
  };

  const externalAdditionalControls = (
    <AdditionalControls
      total={totalHits}
      title={title}
      columns={currentColumns}
      onAddColumn={onAddColumn}
      onRemoveColumn={onRemoveColumn}
      onResetColumns={onResetColumns}
      groupSelectorComponent={groupSelectorComponent}
    />
  );

  const loadingState = isLoadingGridData ? DataLoadingState.loading : DataLoadingState.loaded;

  return (
    <CellActionsProvider getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}>
      <div
        data-test-subj={TEST_SUBJ_DATA_GRID}
        className={styles.gridContainer}
        style={{
          height: computeDataTableRendering.wrapperHeight,
        }}
      >
        <EuiProgress
          size="xs"
          color="accent"
          css={{ opacity: isFetchingGridData ? 1 : 0 }}
          className={styles.gridProgressBar}
        />
        {dataViewIsLoading ? null : loadingState === DataLoadingState.loaded && totalHits === 0 ? (
          <AssetInventoryEmptyState onResetFilters={onResetFilters} />
        ) : (
          <UnifiedDataTable
            key={computeDataTableRendering.mode}
            className={styles.gridStyle}
            ariaLabelledBy={title}
            columns={currentColumns}
            dataView={dataView}
            loadingState={loadingState}
            onFilter={onAddFilter as DocViewFilterFn}
            onResize={onResize}
            onSetColumns={onSetColumns}
            onSort={onSort}
            rows={rows}
            sampleSizeState={MAX_ASSETS_TO_LOAD}
            expandedDoc={expandedDoc}
            setExpandedDoc={openTableFlyout}
            renderDocumentView={EmptyComponent}
            sort={sort}
            rowsPerPageState={pageSize}
            totalHits={totalHits}
            services={services}
            onUpdateRowsPerPage={onChangeItemsPerPage}
            rowHeightState={0}
            showMultiFields={uiSettings.get(SHOW_MULTIFIELDS)}
            showTimeCol={false}
            settings={settings}
            onFetchMoreRecords={loadMore}
            externalCustomRenderers={externalCustomRenderers}
            externalAdditionalControls={externalAdditionalControls}
            gridStyleOverride={gridStyle}
            rowLineHeightOverride="24px"
            dataGridDensityState={DataGridDensity.EXPANDED}
          />
        )}
      </div>
    </CellActionsProvider>
  );
};
