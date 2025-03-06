/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
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
import {
  type RowControlColumn,
  SHOW_MULTIFIELDS,
  SORT_DEFAULT_ORDER_SETTING,
} from '@kbn/discover-utils';
import { type DataTableRecord } from '@kbn/discover-utils/types';
import {
  type EuiDataGridCellValueElementProps,
  type EuiDataGridStyle,
  EuiProgress,
  EuiPageTemplate,
  EuiTitle,
  EuiButtonIcon,
} from '@elastic/eui';
import { type AddFieldFilterHandler } from '@kbn/unified-field-list';
import { generateFilters } from '@kbn/data-plugin/public';
import { type DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { EntityEcs } from '@kbn/securitysolution-ecs/src/entity';

import { EmptyComponent } from '../../common/lib/cell_actions/helpers';
import { type CriticalityLevelWithUnassigned } from '../../../common/entity_analytics/asset_criticality/types';
import { useKibana } from '../../common/lib/kibana';
import { AssetCriticalityBadge } from '../../entity_analytics/components/asset_criticality/asset_criticality_badge';

import { AdditionalControls } from '../components/additional_controls';
import { AssetInventorySearchBar } from '../components/search_bar';
import { RiskBadge } from '../components/risk_badge';
import { Filters } from '../components/filters/filters';
import { EmptyState } from '../components/empty_state';
import { TopAssetsBarChart } from '../components/top_assets_bar_chart';
import { TechnicalPreviewBadge } from '../components/technical_preview_badge';

import { useDynamicEntityFlyout } from '../hooks/use_dynamic_entity_flyout';
import { useDataViewContext } from '../hooks/data_view_context';
import { useStyles } from '../hooks/use_styles';
import {
  useAssetInventoryDataTable,
  type AssetsBaseURLQuery,
  type URLQuery,
} from '../hooks/use_asset_inventory_data_table';
import { useFetchGridData } from '../hooks/use_fetch_grid_data';
import { useFetchChartData } from '../hooks/use_fetch_chart_data';

import {
  DEFAULT_VISIBLE_ROWS_PER_PAGE,
  MAX_ASSETS_TO_LOAD,
  ASSET_INVENTORY_TABLE_ID,
  TEST_SUBJ_DATA_GRID,
  TEST_SUBJ_PAGE_TITLE,
  LOCAL_STORAGE_COLUMNS_KEY,
  LOCAL_STORAGE_COLUMNS_SETTINGS_KEY,
  LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY,
} from '../constants';

const gridStyle: EuiDataGridStyle = {
  border: 'horizontal',
  cellPadding: 'l',
  stripes: false,
  header: 'underline',
};

const title = i18n.translate('xpack.securitySolution.assetInventory.allAssets.tableRowTypeLabel', {
  defaultMessage: 'assets',
});

const moreActionsLabel = i18n.translate(
  'xpack.securitySolution.assetInventory.flyout.moreActionsButton',
  {
    defaultMessage: 'More actions',
  }
);

const columnHeaders: Record<string, string> = {
  'asset.risk': i18n.translate('xpack.securitySolution.assetInventory.allAssets.risk', {
    defaultMessage: 'Risk',
  }),
  'asset.name': i18n.translate('xpack.securitySolution.assetInventory.allAssets.name', {
    defaultMessage: 'Name',
  }),
  'asset.criticality': i18n.translate(
    'xpack.securitySolution.assetInventory.allAssets.criticality',
    {
      defaultMessage: 'Criticality',
    }
  ),
  'asset.source': i18n.translate('xpack.securitySolution.assetInventory.allAssets.source', {
    defaultMessage: 'Source',
  }),
  '@timestamp': i18n.translate('xpack.securitySolution.assetInventory.allAssets.lastSeen', {
    defaultMessage: 'Last Seen',
  }),
} as const;

const customCellRenderer = (rows: DataTableRecord[]): CustomCellRenderer => ({
  'asset.risk': ({ rowIndex }: EuiDataGridCellValueElementProps) => {
    const risk = rows[rowIndex].flattened['asset.risk'] as number;
    return <RiskBadge risk={risk} />;
  },
  'asset.criticality': ({ rowIndex }: EuiDataGridCellValueElementProps) => {
    const criticality = rows[rowIndex].flattened[
      'asset.criticality'
    ] as CriticalityLevelWithUnassigned;
    return <AssetCriticalityBadge criticalityLevel={criticality} />;
  },
});

interface AssetInventoryDefaultColumn {
  id: string;
  width?: number;
}

const defaultColumns: AssetInventoryDefaultColumn[] = [
  { id: 'asset.risk', width: 50 },
  { id: 'asset.name', width: 400 },
  { id: 'asset.criticality' },
  { id: 'asset.source' },
  { id: '@timestamp' },
];

const getDefaultQuery = ({ query, filters }: AssetsBaseURLQuery): URLQuery => ({
  query,
  filters,
  sort: [['@timestamp', 'desc']],
});

// TODO: Asset Inventory - adjust and remove type casting once we have real universal entity data
const getEntity = (record: DataTableRecord) => {
  const { _source } = record.raw;

  const entityMock = {
    tags: ['infrastructure', 'linux', 'admin', 'active'],
    labels: { Group: 'cloud-sec-dev', Environment: 'Production' },
    id: 'mock-entity-id',
    criticality: 'low_impact',
  } as unknown as EntityEcs;

  return {
    entity: { ...(_source?.entity || {}), ...entityMock },
    source: _source || {},
  };
};

export const AllAssets = () => {
  const {
    pageSize,
    sort,
    query,
    queryError,
    urlQuery,
    getRowsFromPages,
    onChangeItemsPerPage,
    onResetFilters,
    onSort,
    setUrlQuery,
  } = useAssetInventoryDataTable({
    paginationLocalStorageKey: LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY,
    columnsLocalStorageKey: LOCAL_STORAGE_COLUMNS_KEY,
    defaultQuery: getDefaultQuery,
  });

  // Table Flyout Controls -------------------------------------------------------------------

  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);

  const { openDynamicFlyout, closeDynamicFlyout } = useDynamicEntityFlyout({
    onFlyoutClose: () => setExpandedDoc(undefined),
  });

  const onExpandDocClick = (record?: DataTableRecord | undefined) => {
    if (record) {
      const { entity, source } = getEntity(record);
      setExpandedDoc(record); // Table is expecting the same record ref to highlight the selected row
      openDynamicFlyout({
        entity,
        source,
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
    // error: fetchError,
    fetchNextPage: loadMore,
    isFetching: isFetchingGridData,
    isLoading: isLoadingGridData,
  } = useFetchGridData({
    query,
    sort,
    enabled: !queryError,
    pageSize: DEFAULT_VISIBLE_ROWS_PER_PAGE,
  });

  const {
    data: chartData,
    // error: fetchChartDataError,
    isFetching: isFetchingChartData,
    isLoading: isLoadingChartData,
  } = useFetchChartData({
    query,
    sort,
    enabled: !queryError,
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

  const { dataView } = useDataViewContext();

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
      // If virtualization is not needed the table will render unconstrained.
      if (!isVirtualizationEnabled) return 'auto';

      const baseHeight = 362; // height of Kibana Header + Findings page header and search bar
      return `calc(100vh - ${baseHeight}px)`;
    };

    return {
      wrapperHeight: getWrapperHeight(),
      mode: isVirtualizationEnabled ? 'virtualized' : 'standard',
    };
  }, [pageSize]);

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
      dataView={dataView}
      title={title}
      columns={currentColumns}
      onAddColumn={onAddColumn}
      onRemoveColumn={onRemoveColumn}
      onResetColumns={onResetColumns}
    />
  );

  const externalControlColumns: RowControlColumn[] = [
    {
      id: 'more-actions',
      headerAriaLabel: moreActionsLabel,
      headerCellRender: () => null,
      renderControl: () => (
        <EuiButtonIcon
          aria-label={moreActionsLabel}
          iconType="boxesHorizontal"
          color="primary"
          isLoading={isLoadingGridData}
        />
      ),
    },
  ];

  const loadingState =
    isLoadingGridData || !dataView ? DataLoadingState.loading : DataLoadingState.loaded;

  return (
    <I18nProvider>
      <AssetInventorySearchBar
        query={urlQuery}
        setQuery={setUrlQuery}
        loading={loadingState === DataLoadingState.loading}
      />
      <EuiPageTemplate.Section>
        <EuiTitle size="l" data-test-subj={TEST_SUBJ_PAGE_TITLE}>
          <h1>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.allAssets.title"
              defaultMessage="All Assets"
            />
            <TechnicalPreviewBadge />
          </h1>
        </EuiTitle>
        <Filters setQuery={setUrlQuery} />
        {dataView ? (
          <TopAssetsBarChart
            isLoading={isLoadingChartData}
            isFetching={isFetchingChartData}
            entities={!!chartData && chartData.length > 0 ? chartData : []}
          />
        ) : null}
        <CellActionsProvider getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}>
          <div
            data-test-subj={TEST_SUBJ_DATA_GRID}
            className={styles.gridContainer}
            style={{
              height: computeDataTableRendering.wrapperHeight,
            }}
          >
            <EuiProgress size="xs" color="accent" style={{ opacity: isFetchingGridData ? 1 : 0 }} />
            {!dataView ? null : loadingState === DataLoadingState.loaded && totalHits === 0 ? (
              <EmptyState onResetFilters={onResetFilters} />
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
                setExpandedDoc={onExpandDocClick}
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
                rowAdditionalLeadingControls={externalControlColumns}
                externalCustomRenderers={externalCustomRenderers}
                externalAdditionalControls={externalAdditionalControls}
                gridStyleOverride={gridStyle}
                rowLineHeightOverride="24px"
                dataGridDensityState={DataGridDensity.EXPANDED}
              />
            )}
          </div>
        </CellActionsProvider>
      </EuiPageTemplate.Section>
    </I18nProvider>
  );
};
