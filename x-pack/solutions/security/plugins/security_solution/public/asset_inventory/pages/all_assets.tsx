/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import _ from 'lodash';
import { type Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import {
  UnifiedDataTable,
  DataLoadingState,
  DataGridDensity,
  useColumns,
  type UnifiedDataTableSettings,
  type UnifiedDataTableSettingsColumn,
} from '@kbn/unified-data-table';
import { CellActionsProvider } from '@kbn/cell-actions';
import { type HttpSetup } from '@kbn/core-http-browser';
import { SHOW_MULTIFIELDS, SORT_DEFAULT_ORDER_SETTING } from '@kbn/discover-utils';
import { type DataTableRecord } from '@kbn/discover-utils/types';
import {
  type EuiDataGridCellValueElementProps,
  type EuiDataGridControlColumn,
  type EuiDataGridStyle,
  EuiProgress,
  EuiPageTemplate,
  EuiTitle,
  EuiButtonIcon,
  EuiBetaBadge,
  useEuiTheme,
} from '@elastic/eui';
import { type AddFieldFilterHandler } from '@kbn/unified-field-list';
import { generateFilters } from '@kbn/data-plugin/public';
import { type DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { css } from '@emotion/react';

import type { EntityEcs } from '@kbn/securitysolution-ecs/src/entity';
import { EmptyComponent } from '../../common/lib/cell_actions/helpers';
import { useDynamicEntityFlyout } from '../hooks/use_dynamic_entity_flyout';
import { type CriticalityLevelWithUnassigned } from '../../../common/entity_analytics/asset_criticality/types';
import { useKibana } from '../../common/lib/kibana';

import { AssetCriticalityBadge } from '../../entity_analytics/components/asset_criticality/asset_criticality_badge';
import { AdditionalControls } from '../components/additional_controls';
import { AssetInventorySearchBar } from '../components/search_bar';
import { RiskBadge } from '../components/risk_badge';
import { Filters } from '../components/filters/filters';

import { useDataViewContext } from '../hooks/data_view_context';
import { useStyles } from '../hooks/use_styles';
import {
  useAssetInventoryDataTable,
  type AssetsBaseURLQuery,
  type URLQuery,
} from '../hooks/use_asset_inventory_data_table';

const gridStyle: EuiDataGridStyle = {
  border: 'horizontal',
  cellPadding: 'l',
  stripes: false,
  header: 'underline',
};

const MAX_ASSETS_TO_LOAD = 500; // equivalent to MAX_FINDINGS_TO_LOAD in @kbn/cloud-security-posture-common

const title = i18n.translate('xpack.securitySolution.assetInventory.allAssets.tableRowTypeLabel', {
  defaultMessage: 'assets',
});

const columnsLocalStorageKey = 'assetInventoryColumns';
const LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY = 'assetInventory:dataTable:pageSize';

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

const customCellRenderer = (rows: DataTableRecord[]) => ({
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

export interface AllAssetsProps {
  rows: DataTableRecord[];
  isLoading: boolean;
  height?: number | string;
  loadMore: () => void;
  nonPersistedFilters?: Filter[];
  hasDistributionBar?: boolean;
  /**
   * This function will be used in the control column to create a rule for a specific finding.
   */
  createFn?: (rowIndex: number) => ((http: HttpSetup) => Promise<unknown>) | undefined;
  'data-test-subj'?: string;
}

// TODO: Asset Inventory - adjust and remove type casting once we have real universal entity data
const getEntity = (row: DataTableRecord): EntityEcs => {
  return {
    id: (row.flattened['asset.name'] as string) || '',
    name: (row.flattened['asset.name'] as string) || '',
    timestamp: row.flattened['@timestamp'] as Date,
    type: 'universal',
  };
};

const ASSET_INVENTORY_TABLE_ID = 'asset-inventory-table';

const AllAssets = ({
  rows,
  isLoading,
  loadMore,
  nonPersistedFilters,
  height,
  hasDistributionBar = true,
  createFn,
  ...rest
}: AllAssetsProps) => {
  const { euiTheme } = useEuiTheme();
  const assetInventoryDataTable = useAssetInventoryDataTable({
    paginationLocalStorageKey: LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY,
    columnsLocalStorageKey,
    defaultQuery: getDefaultQuery,
    nonPersistedFilters,
  });

  // Table Flyout Controls -------------------------------------------------------------------

  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);

  const { openDynamicFlyout, closeDynamicFlyout } = useDynamicEntityFlyout({
    onFlyoutClose: () => setExpandedDoc(undefined),
  });

  const onExpandDocClick = (doc?: DataTableRecord | undefined) => {
    if (doc) {
      const entity = getEntity(doc);
      setExpandedDoc(doc); // Table is expecting the same doc ref to highlight the selected row
      openDynamicFlyout({
        entity,
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
    // columnsLocalStorageKey,
    pageSize,
    onChangeItemsPerPage,
    setUrlQuery,
    onSort,
    filters,
    sort,
  } = assetInventoryDataTable;

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
  }, [persistedSettings]);

  const { dataView, dataViewIsLoading, dataViewIsRefetching } = useDataViewContext();

  const {
    uiActions,
    uiSettings,
    dataViews,
    data,
    application,
    theme,
    fieldFormats,
    notifications,
    storage,
  } = useKibana().services;

  const styles = useStyles();

  const { capabilities } = application;
  const { filterManager } = data.query;

  const services = {
    theme,
    fieldFormats,
    uiSettings,
    toastNotifications: notifications.toasts,
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
  }, [rows]);

  const onResetColumns = () => {
    setColumns(defaultColumns.map((c) => c.id));
  };

  const externalAdditionalControls = (
    <AdditionalControls
      total={rows.length}
      dataView={dataView}
      title={title}
      columns={currentColumns}
      onAddColumn={onAddColumn}
      onRemoveColumn={onRemoveColumn}
      // groupSelectorComponent={groupSelectorComponent}
      onResetColumns={onResetColumns}
    />
  );

  const externalControlColumns: EuiDataGridControlColumn[] = [
    {
      id: 'take-action',
      width: 20,
      headerCellRender: () => null,
      rowCellRender: ({ rowIndex }) => (
        <EuiButtonIcon
          aria-label={i18n.translate(
            'xpack.securitySolution.assetInventory.flyout.moreActionsButton',
            {
              defaultMessage: 'More actions',
            }
          )}
          iconType="boxesHorizontal"
          color="primary"
          isLoading={isLoading}
          // onClick={() => createFn(rowIndex)}
        />
      ),
    },
  ];

  const loadingStyle = {
    opacity: isLoading ? 1 : 0,
  };

  const loadingState =
    isLoading || dataViewIsLoading || dataViewIsRefetching || !dataView
      ? DataLoadingState.loading
      : DataLoadingState.loaded;

  return (
    <I18nProvider>
      {!dataView ? null : (
        <AssetInventorySearchBar
          query={getDefaultQuery({ query: { query: '', language: '' }, filters: [] })}
          setQuery={setUrlQuery}
          loading={loadingState === DataLoadingState.loading}
        />
      )}
      <EuiPageTemplate.Section>
        <EuiTitle size="l" data-test-subj="all-assets-title">
          <h1>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.allAssets"
              defaultMessage="All Assets"
            />
            <EuiBetaBadge
              css={css`
                margin-left: ${euiTheme.size.s};
              `}
              label={i18n.translate('xpack.securitySolution.assetInventory.technicalPreviewLabel', {
                defaultMessage: 'Technical Preview',
              })}
              size="s"
              color="subdued"
              tooltipContent={i18n.translate(
                'xpack.securitySolution.assetInventory.technicalPreviewTooltip',
                {
                  defaultMessage:
                    'This functionality is experimental and not supported. It may change or be removed at any time.',
                }
              )}
            />
          </h1>
        </EuiTitle>
        <Filters onFiltersChange={() => {}} />
        <CellActionsProvider getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}>
          <div
            data-test-subj={rest['data-test-subj']}
            className={styles.gridContainer}
            style={{
              height: computeDataTableRendering.wrapperHeight,
            }}
          >
            <EuiProgress size="xs" color="accent" style={loadingStyle} />
            {!dataView ? null : (
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
                totalHits={rows.length}
                services={services}
                onUpdateRowsPerPage={onChangeItemsPerPage}
                rowHeightState={0}
                showMultiFields={uiSettings.get(SHOW_MULTIFIELDS)}
                showTimeCol={false}
                settings={settings}
                onFetchMoreRecords={loadMore}
                externalControlColumns={externalControlColumns}
                externalCustomRenderers={externalCustomRenderers}
                externalAdditionalControls={externalAdditionalControls}
                gridStyleOverride={gridStyle}
                rowLineHeightOverride="24px"
                dataGridDensityState={DataGridDensity.EXPANDED}
                showFullScreenButton
                // showKeyboardShortcuts
              />
            )}
          </div>
        </CellActionsProvider>
      </EuiPageTemplate.Section>
    </I18nProvider>
  );
};

// we need to use default exports to import it via React.lazy
export default AllAssets; // eslint-disable-line import/no-default-export
