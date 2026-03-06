/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useState, useMemo, useEffect, useCallback } from 'react';
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
  type CustomGridColumnsConfiguration,
  type DataGridCellValueElementProps,
} from '@kbn/unified-data-table';
import { CellActionsProvider } from '@kbn/cell-actions';
import {
  SHOW_MULTIFIELDS,
  SORT_DEFAULT_ORDER_SETTING,
  formatFieldValue,
} from '@kbn/discover-utils';
import { type DataTableRecord } from '@kbn/discover-utils/types';
import {
  EuiButtonIcon,
  EuiToolTip,
  type EuiDataGridCellValueElementProps,
  type EuiDataGridControlColumn,
  type EuiDataGridStyle,
  EuiProgress,
} from '@elastic/eui';
import { type AddFieldFilterHandler } from '@kbn/unified-field-list';
import { generateFilters } from '@kbn/data-plugin/public';
import { type DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';

import type { inputsModel } from '../../../../common/store';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { InspectButton } from '../../../../common/components/inspect';
import { useInvestigateInTimeline } from '../../../../common/hooks/timeline/use_investigate_in_timeline';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { createDataProviders } from '../../../../app/actions/add_to_timeline/data_provider';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';
import {
  SecurityAgentBuilderAttachments,
  THREAT_HUNTING_AGENT_ID,
} from '../../../../../common/constants';
import { EmptyComponent } from '../../../../common/lib/cell_actions/helpers';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { useKibana } from '../../../../common/lib/kibana';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import { EntityTypeToIdentifierField } from '../../../../../common/entity_analytics/types';
import {
  EntityPanelKeyByType,
  EntityPanelParamByType,
} from '../../../../flyout/entity_details/shared/constants';

import type { CriticalityLevelWithUnassigned } from '../../../../../common/entity_analytics/asset_criticality/types';
import { AssetCriticalityBadge } from '../../asset_criticality';
import { LastUpdated } from '../last_updated';
import { EntityAlertsCell } from '../entity_alerts_cell';
import { RiskScoreCell } from './risk_score_cell';

import { AdditionalControls } from './additional_controls';
import { EntitiesEmptyState } from './empty_state';
import { DataViewContext } from './index';
import { useStyles } from './hooks/use_styles';
import { useFetchGridData } from './hooks/use_fetch_grid_data';
import type { EntityURLStateResult } from './hooks/use_entity_url_state';
import {
  ENTITY_ANALYTICS_TABLE_ID,
  ENTITY_FIELDS,
  DEFAULT_VISIBLE_ROWS_PER_PAGE,
  MAX_ENTITIES_TO_LOAD,
  TEST_SUBJ_DATA_GRID,
  LOCAL_STORAGE_COLUMNS_SETTINGS_KEY,
  ENTITY_ANALYTICS_LOCAL_STORAGE_COLUMNS_KEY,
} from './constants';

interface DefaultColumn {
  id: string;
  width?: number;
}

const gridStyle: EuiDataGridStyle = {
  border: 'horizontal',
  cellPadding: 'l',
  stripes: false,
  header: 'underline',
};

const ROW_TYPE_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entitiesTable.rowTypeLabel',
  { defaultMessage: 'entities' }
);

const INSPECT_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entitiesTable.inspectTitle',
  { defaultMessage: 'Entity analytics table' }
);

const COLUMN_HEADERS: Record<string, string> = {
  [ENTITY_FIELDS.ENTITY_NAME]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.entitiesTable.columnEntityName',
    { defaultMessage: 'Entity name' }
  ),
  [ENTITY_FIELDS.ENTITY_ID]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.entitiesTable.columnEntityId',
    { defaultMessage: 'Entity id' }
  ),
  [ENTITY_FIELDS.ENTITY_SOURCE]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.entitiesTable.columnDataSource',
    { defaultMessage: 'Data source' }
  ),
  [ENTITY_FIELDS.ENTITY_RISK]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.entitiesTable.columnRiskScore',
    { defaultMessage: 'Risk score' }
  ),
  [ENTITY_FIELDS.ASSET_CRITICALITY]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.entitiesTable.columnAssetCriticality',
    { defaultMessage: 'Asset criticality' }
  ),
  [ENTITY_FIELDS.RESOLVED_TO]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.entitiesTable.columnResolvedTo',
    { defaultMessage: 'Resolved to' }
  ),
  [ENTITY_FIELDS.ENTITY_TYPE]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.entitiesTable.columnEntityType',
    { defaultMessage: 'Entity type' }
  ),
  alerts: i18n.translate('xpack.securitySolution.entityAnalytics.entitiesTable.columnAlerts', {
    defaultMessage: 'Alerts',
  }),
  [ENTITY_FIELDS.TIMESTAMP]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.entitiesTable.columnLastSeen',
    { defaultMessage: 'Last seen' }
  ),
};

const DEFAULT_COLUMNS: DefaultColumn[] = [
  { id: ENTITY_FIELDS.ENTITY_NAME, width: 200 },
  { id: ENTITY_FIELDS.ENTITY_ID, width: 300 },
  { id: ENTITY_FIELDS.ENTITY_SOURCE, width: 200 },
  { id: ENTITY_FIELDS.RESOLVED_TO, width: 300 },
  { id: ENTITY_FIELDS.ENTITY_TYPE, width: 200 },
  { id: ENTITY_FIELDS.ENTITY_RISK, width: 200 },
  { id: ENTITY_FIELDS.ASSET_CRITICALITY, width: 200 },
  { id: 'alerts', width: 300 },
  { id: ENTITY_FIELDS.TIMESTAMP, width: 200 },
];

export interface EntitiesDataTableProps {
  state: EntityURLStateResult;
  height?: number;
  groupSelectorComponent?: JSX.Element;
}

const getEntityFields = (doc: DataTableRecord) => {
  const source = doc.raw._source as Record<string, unknown> | undefined;
  const entityType =
    (((source?.entity as Record<string, unknown>)?.EngineMetadata as Record<string, unknown>)
      ?.Type as EntityType | undefined) ??
    (doc.flattened['entity.EngineMetadata.Type'] as EntityType | undefined);
  const entityName =
    ((source?.entity as Record<string, unknown>)?.name as string | undefined) ??
    (doc.flattened['entity.name'] as string | undefined);
  return { entityType, entityName };
};

const createEntityDataProviders = (
  entityType: EntityType | undefined,
  entityName: string | undefined
) => {
  if (!entityName || !entityType) return null;
  const fieldName: string = EntityTypeToIdentifierField[entityType] || 'entity.id';
  return createDataProviders({
    contextId: ENTITY_ANALYTICS_TABLE_ID,
    field: fieldName,
    values: entityName,
  });
};

export const EntitiesDataTable = ({
  state,
  height,
  groupSelectorComponent,
}: EntitiesDataTableProps) => {
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

  const { openRightPanel, closeFlyout } = useExpandableFlyoutApi();
  const { investigateInTimeline } = useInvestigateInTimeline();
  const {
    timelinePrivileges: { read: canUseTimeline },
  } = useUserPrivileges();
  const { setQuery, deleteQuery } = useGlobalTime();
  const { isAgentBuilderEnabled } = useAgentBuilderAvailability();
  const { agentBuilder } = useKibana().services;

  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);

  const openTableFlyout = useCallback(
    (doc?: DataTableRecord | undefined) => {
      if (doc) {
        setExpandedDoc(doc);
        const { entityType, entityName } = getEntityFields(doc);
        if (!entityType || !entityName) return;

        const panelKey = EntityPanelKeyByType[entityType];
        const panelParam = EntityPanelParamByType[entityType];
        if (!panelKey || !panelParam) return;

        openRightPanel({
          id: panelKey,
          params: {
            [panelParam]: entityName,
            contextID: ENTITY_ANALYTICS_TABLE_ID,
            scopeId: ENTITY_ANALYTICS_TABLE_ID,
          },
        });
      } else {
        closeFlyout();
        setExpandedDoc(undefined);
      }
    },
    [openRightPanel, closeFlyout]
  );

  const {
    data: rowsData,
    fetchNextPage: loadMore,
    isFetching: isFetchingGridData,
    isLoading: isLoadingGridData,
    refetch,
  } = useFetchGridData({
    query,
    sort,
    enabled: !queryError,
    pageSize: DEFAULT_VISIBLE_ROWS_PER_PAGE,
  });

  const rows = getRowsFromPages(rowsData?.pages);
  const totalHits = rowsData?.pages[0]?.total || 0;

  const inspectData = useMemo<inputsModel.InspectQuery | null>(
    () => (rowsData?.pages[0]?.inspect as inputsModel.InspectQuery) ?? null,
    [rowsData?.pages]
  );

  useEffect(() => {
    setQuery({
      id: ENTITY_ANALYTICS_TABLE_ID,
      inspect: inspectData,
      loading: isLoadingGridData,
      refetch,
    });
    return () => {
      deleteQuery({ id: ENTITY_ANALYTICS_TABLE_ID });
    };
  }, [setQuery, deleteQuery, inspectData, isLoadingGridData, refetch]);

  const [lastUpdatedAt, setLastUpdatedAt] = useState(Date.now());
  useEffect(() => {
    if (rowsData?.pages?.length && !isLoadingGridData) {
      setLastUpdatedAt(Date.now());
    }
  }, [rowsData?.pages, isLoadingGridData]);

  const [localStorageColumns, setLocalStorageColumns] = useLocalStorage(
    ENTITY_ANALYTICS_LOCAL_STORAGE_COLUMNS_KEY,
    DEFAULT_COLUMNS.map((c) => c.id)
  );

  const [persistedSettings, setPersistedSettings] = useLocalStorage<UnifiedDataTableSettings>(
    LOCAL_STORAGE_COLUMNS_SETTINGS_KEY,
    {
      columns: DEFAULT_COLUMNS.reduce((columnSettings, column) => {
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
            display: COLUMN_HEADERS[columnId],
          };

          return { ...columnSettings, [columnId]: newColumn };
        },
        {} as UnifiedDataTableSettings['columns']
      ),
    };
  }, [persistedSettings]);

  const { dataView, dataViewIsLoading } = useContext(DataViewContext);

  const customGridColumnsConfiguration = useMemo<CustomGridColumnsConfiguration>(() => {
    const config: CustomGridColumnsConfiguration = {
      alerts: ({ column }) => ({ ...column, isExpandable: false }),
    };
    if (dataView.timeFieldName) {
      config[dataView.timeFieldName] = ({ column }) => ({ ...column, display: undefined });
    }
    return config;
  }, [dataView.timeFieldName]);

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

  const computeDataTableRendering = useMemo(() => {
    const isVirtualizationEnabled = pageSize >= 100;

    const getWrapperHeight = () => {
      if (height) return height;
      if (!isVirtualizationEnabled) return 'auto';

      const baseHeight = 362;
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

  const externalCustomRenderers = useMemo<CustomCellRenderer>(() => {
    const nullSafeRenderers: CustomCellRenderer = Object.fromEntries(
      currentColumns.map((columnId) => [
        columnId,
        ({ row, dataView: dv, fieldFormats: ff }: DataGridCellValueElementProps) => {
          const value = row.flattened[columnId];
          if (value === null || value === undefined) {
            return getEmptyTagValue();
          }
          const field = dv.fields.getByName(columnId);
          return <>{formatFieldValue(value, row.raw, ff, dv, field, 'text')}</>;
        },
      ])
    );

    const specificRenderers: CustomCellRenderer = {
      [ENTITY_FIELDS.ENTITY_TYPE]: ({ row }: DataGridCellValueElementProps) => {
        const value = row.flattened[ENTITY_FIELDS.ENTITY_TYPE] as string | undefined;
        if (value == null) return getEmptyTagValue();
        return <>{_.capitalize(value)}</>;
      },
      [ENTITY_FIELDS.ASSET_CRITICALITY]: ({ row }: DataGridCellValueElementProps) => {
        const value = row.flattened[ENTITY_FIELDS.ASSET_CRITICALITY] as
          | CriticalityLevelWithUnassigned
          | undefined;
        if (value == null) return getEmptyTagValue();
        return <AssetCriticalityBadge criticalityLevel={value} />;
      },
      [ENTITY_FIELDS.ENTITY_RISK]: ({ row }: DataGridCellValueElementProps) => {
        const value = row.flattened[ENTITY_FIELDS.ENTITY_RISK] as number | undefined;
        return <RiskScoreCell riskScore={value != null ? Number(value) : undefined} />;
      },
      alerts: ({ rowIndex }: EuiDataGridCellValueElementProps) => {
        const doc = rows[rowIndex];
        if (!doc) return null;
        const { entityType, entityName } = getEntityFields(doc);
        if (!entityName || !entityType) return null;
        return <EntityAlertsCell entityName={entityName} entityType={entityType} />;
      },
    };

    return {
      ...nullSafeRenderers,
      ...specificRenderers,
    };
  }, [rows, currentColumns]);

  const leadingControlColumns = useMemo<EuiDataGridControlColumn[]>(() => {
    const columns: EuiDataGridControlColumn[] = [];

    if (canUseTimeline) {
      columns.push({
        id: 'entity-analytics-timeline-action',
        width: 40,
        headerCellRender: () => null,
        rowCellRender: function TimelineActionCell({ rowIndex }) {
          const doc = rows[rowIndex];
          if (!doc) return null;

          const { entityType, entityName } = getEntityFields(doc);
          if (!entityName || !entityType) return null;

          const handleTimelineClick = () => {
            const dataProviders = createEntityDataProviders(entityType, entityName);
            if (dataProviders && dataProviders.length > 0) {
              investigateInTimeline({ dataProviders });
            }
          };

          return (
            <EuiToolTip
              content={i18n.translate(
                'xpack.securitySolution.entityAnalytics.entitiesTable.investigateInTimeline',
                { defaultMessage: 'Investigate in timeline' }
              )}
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                iconType="timeline"
                size="s"
                color="text"
                onClick={handleTimelineClick}
                aria-label={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.entitiesTable.investigateInTimeline',
                  { defaultMessage: 'Investigate in timeline' }
                )}
                data-test-subj="entity-analytics-home-timeline-icon"
              />
            </EuiToolTip>
          );
        },
      });
    }

    if (isAgentBuilderEnabled && agentBuilder?.openConversationFlyout) {
      columns.push({
        id: 'entity-analytics-ai-action',
        width: 40,
        headerCellRender: () => null,
        rowCellRender: function AiActionCell({ rowIndex }) {
          const doc = rows[rowIndex];
          if (!doc) return null;

          const { entityType, entityName } = getEntityFields(doc);
          if (!entityName || !entityType) return null;

          const handleAddToChat = () => {
            const attachmentId = `${SecurityAgentBuilderAttachments.entity}-${Date.now()}`;
            agentBuilder.openConversationFlyout({
              autoSendInitialMessage: false,
              newConversation: true,
              initialMessage: i18n.translate(
                'xpack.securitySolution.entityAnalytics.entitiesTable.aiInvestigationPrompt',
                {
                  defaultMessage:
                    'Investigate this entity and provide relevant context about its risk and activity.',
                }
              ),
              attachments: [
                {
                  id: attachmentId,
                  type: SecurityAgentBuilderAttachments.entity,
                  data: {
                    identifierType: entityType,
                    identifier: entityName,
                    attachmentLabel: `${entityType}: ${entityName}`,
                  },
                },
              ],
              sessionTag: 'security',
              agentId: THREAT_HUNTING_AGENT_ID,
            });
          };

          return (
            <EuiToolTip
              content={i18n.translate(
                'xpack.securitySolution.entityAnalytics.entitiesTable.addToChat',
                { defaultMessage: 'Add to chat' }
              )}
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                iconType="sparkles"
                size="s"
                color="text"
                onClick={handleAddToChat}
                aria-label={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.entitiesTable.addToChat',
                  { defaultMessage: 'Add to chat' }
                )}
                data-test-subj="entity-analytics-home-ai-action-icon"
              />
            </EuiToolTip>
          );
        },
      });
    }

    return columns;
  }, [canUseTimeline, investigateInTimeline, rows, isAgentBuilderEnabled, agentBuilder]);

  const onResetColumns = () => {
    setLocalStorageColumns(DEFAULT_COLUMNS.map((c) => c.id));
  };

  const handleAddColumn = (columnId: string) => {
    onAddColumn(columnId);
  };

  const handleRemoveColumn = (columnId: string) => {
    onRemoveColumn(columnId);
  };

  const externalAdditionalControls = (
    <AdditionalControls
      total={totalHits}
      title={ROW_TYPE_LABEL}
      columns={currentColumns}
      onAddColumn={handleAddColumn}
      onRemoveColumn={handleRemoveColumn}
      onResetColumns={onResetColumns}
    />
  );

  const externalAdditionalControlsRight = (
    <>
      <InspectButton queryId={ENTITY_ANALYTICS_TABLE_ID} title={INSPECT_TITLE} />
      <LastUpdated updatedAt={lastUpdatedAt} />
      {groupSelectorComponent}
    </>
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
          <EntitiesEmptyState onResetFilters={onResetFilters} />
        ) : (
          <UnifiedDataTable
            key={computeDataTableRendering.mode}
            className={styles.gridStyle}
            ariaLabelledBy={ROW_TYPE_LABEL}
            columns={currentColumns}
            dataView={dataView}
            loadingState={loadingState}
            onFilter={onAddFilter as DocViewFilterFn}
            onResize={onResize}
            onSetColumns={onSetColumns}
            onSort={onSort}
            rows={rows}
            sampleSizeState={MAX_ENTITIES_TO_LOAD}
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
            externalAdditionalControlsRight={externalAdditionalControlsRight}
            gridStyleOverride={gridStyle}
            rowLineHeightOverride="24px"
            dataGridDensityState={DataGridDensity.EXPANDED}
            externalControlColumns={leadingControlColumns}
            customGridColumnsConfiguration={customGridColumnsConfiguration}
          />
        )}
      </div>
    </CellActionsProvider>
  );
};
