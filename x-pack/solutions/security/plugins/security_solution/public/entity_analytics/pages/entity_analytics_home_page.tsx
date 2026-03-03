/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiToolTip,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import type { EuiDataGridControlColumn, EuiDataGridCellValueElementProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { CustomCellRenderer } from '@kbn/unified-data-table';
import type { GroupOption } from '@kbn/grouping';
import { SecurityPageName } from '../../app/types';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { EmptyPrompt } from '../../common/components/empty_prompt';
import { SiemSearchBar } from '../../common/components/search_bar';
import { InputsModelId } from '../../common/store/inputs/constants';
import { FiltersGlobal } from '../../common/components/filters_global';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useSourcererDataView } from '../../sourcerer/containers';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { PageLoader } from '../../common/components/page_loader';
import { PageScope } from '../../data_view_manager/constants';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { useGlobalTime } from '../../common/containers/use_global_time';
import { useInvestigateInTimeline } from '../../common/hooks/timeline/use_investigate_in_timeline';
import { useUserPrivileges } from '../../common/components/user_privileges';
import { createDataProviders } from '../../app/actions/add_to_timeline/data_provider';
import type { EntityType } from '../../../common/entity_analytics/types';
import { EntityTypeToIdentifierField } from '../../../common/entity_analytics/types';
import {
  EntityPanelKeyByType,
  EntityPanelParamByType,
} from '../../flyout/entity_details/shared/constants';
import { DataViewContext } from '../../asset_inventory/hooks/data_view_context';
import {
  useAssetInventoryURLState,
  type AssetsBaseURLQuery,
  type URLQuery,
} from '../../asset_inventory/hooks/use_asset_inventory_url_state/use_asset_inventory_url_state';
import { AssetInventoryTableSection } from '../../asset_inventory/components/asset_inventory_table_section';
import type { GroupingLabelOverrides } from '../../asset_inventory/components/grouping/use_asset_inventory_grouping';
import type { GenericEntityRecord } from '../../asset_inventory/types/generic_entity_record';
import { CombinedRiskDonutChart } from '../components/home/combined_risk_donut_chart';
import { AnomaliesPlaceholderPanel } from '../components/home/anomalies_placeholder_panel';
import { WatchlistFilter } from '../components/watchlists/watchlist_filter';
import { useKibana } from '../../common/lib/kibana';
import { useAgentBuilderAvailability } from '../../agent_builder/hooks/use_agent_builder_availability';
import {
  SecurityAgentBuilderAttachments,
  THREAT_HUNTING_AGENT_ID,
} from '../../../common/constants';
import { useEntityStoreDataView } from '../components/home/use_entity_store_data_view';
import { EntityAlertsCell } from '../components/home/entity_alerts_cell';
import {
  ENTITY_ANALYTICS_TABLE_ID,
  ENTITY_ANALYTICS_LOCAL_STORAGE_COLUMNS_KEY,
  ENTITY_ANALYTICS_LOCAL_STORAGE_PAGE_SIZE_KEY,
} from '../components/home/constants';
import type { AssetInventoryDefaultColumn } from '../../asset_inventory/components/asset_inventory_data_table';

const getDefaultQuery = ({ query, filters }: AssetsBaseURLQuery): URLQuery => ({
  query,
  filters,
  pageFilters: [],
  sort: [['@timestamp', 'desc']],
});

const createEntityDataProviders = (
  entityType: EntityType | undefined,
  entityName: string | undefined
) => {
  if (!entityName || !entityType) {
    return null;
  }

  const fieldName: string = EntityTypeToIdentifierField[entityType] || 'entity.id';

  return createDataProviders({
    contextId: ENTITY_ANALYTICS_TABLE_ID,
    field: fieldName,
    values: entityName,
  });
};

const ENTITY_ANALYTICS_GROUPING_OPTIONS: GroupOption[] = [
  {
    label: i18n.translate('xpack.securitySolution.entityAnalytics.homePage.groupByEntityType', {
      defaultMessage: 'Entity type',
    }),
    key: 'entity.EngineMetadata.Type',
  },
];

const ENTITY_ANALYTICS_GROUPING_LABEL_OVERRIDES: GroupingLabelOverrides = {
  title: i18n.translate('xpack.securitySolution.entityAnalytics.homePage.groupEntitiesBy', {
    defaultMessage: 'Group entities by',
  }),
  unit: (totalCount: number) =>
    i18n.translate('xpack.securitySolution.entityAnalytics.homePage.groupingUnit', {
      values: { totalCount },
      defaultMessage: '{totalCount, plural, =1 {entity} other {entities}}',
    }),
  groupsUnit: (totalCount: number, _selectedGroup: string, hasNullGroup: boolean) => {
    const groupCount = hasNullGroup ? totalCount - 1 : totalCount;
    return i18n.translate('xpack.securitySolution.entityAnalytics.homePage.groupingGroupsUnit', {
      values: { groupCount },
      defaultMessage: '{groupCount, plural, =1 {group} other {groups}}',
    });
  },
  getGroupStats: (_selectedGroup, bucket) => [
    {
      title: i18n.translate(
        'xpack.securitySolution.entityAnalytics.homePage.groupingStatsEntities',
        { defaultMessage: 'Entities' }
      ),
      badge: {
        value: bucket.doc_count,
      },
    },
  ],
};

const ENTITY_ANALYTICS_COLUMN_HEADERS: Record<string, string> = {
  'entity.name': i18n.translate(
    'xpack.securitySolution.entityAnalytics.homePage.columnEntityName',
    { defaultMessage: 'Entity name' }
  ),
  'entity.id': i18n.translate('xpack.securitySolution.entityAnalytics.homePage.columnEntityId', {
    defaultMessage: 'Entity id',
  }),
  'entity.source': i18n.translate(
    'xpack.securitySolution.entityAnalytics.homePage.columnDataSource',
    {
      defaultMessage: 'Data source',
    }
  ),
  'entity.risk.calculated_score_norm': i18n.translate(
    'xpack.securitySolution.entityAnalytics.homePage.columnRiskScore',
    {
      defaultMessage: 'Risk score',
    }
  ),
  'asset.criticality': i18n.translate(
    'xpack.securitySolution.entityAnalytics.homePage.columnAssetCriticality',
    {
      defaultMessage: 'Asset criticality',
    }
  ),
  'entity.relationships.resolution.resolved_to': i18n.translate(
    'xpack.securitySolution.entityAnalytics.homePage.columnResolvedTo',
    {
      defaultMessage: 'Resolved to',
    }
  ),
  'entity.EngineMetadata.Type': i18n.translate(
    'xpack.securitySolution.entityAnalytics.homePage.columnEntityType',
    {
      defaultMessage: 'Entity type',
    }
  ),
  alerts: i18n.translate('xpack.securitySolution.entityAnalytics.homePage.columnAlerts', {
    defaultMessage: 'Alerts',
  }),
  '@timestamp': i18n.translate('xpack.securitySolution.entityAnalytics.homePage.columnLastSeen', {
    defaultMessage: 'Last seen',
  }),
};

const ENTITY_ANALYTICS_DEFAULT_COLUMNS: AssetInventoryDefaultColumn[] = [
  { id: 'entity.name', width: 400 },
  { id: 'entity.id', width: 500 },
  { id: 'entity.source' },
  { id: 'entity.relationships.resolution.resolved_to' },
  { id: 'entity.EngineMetadata.Type', width: 200 },
  { id: 'entity.risk.calculated_score_norm', width: 200 },
  { id: 'asset.criticality' },
  { id: 'alerts', width: 800 },
  { id: '@timestamp' },
];

export const EntityAnalyticsHomePage = () => {
  const {
    indicesExist: oldIndicesExist,
    loading: oldIsSourcererLoading,
    sourcererDataView: oldSourcererDataViewSpec,
  } = useSourcererDataView();
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { dataView, status } = useDataView(PageScope.explore);

  const isSourcererLoading = useMemo(
    () => (newDataViewPickerEnabled ? status !== 'ready' : oldIsSourcererLoading),
    [newDataViewPickerEnabled, oldIsSourcererLoading, status]
  );

  const indicesExist = useMemo(
    () => (newDataViewPickerEnabled ? !!dataView?.matchedIndices?.length : oldIndicesExist),
    [dataView?.matchedIndices?.length, newDataViewPickerEnabled, oldIndicesExist]
  );

  const isXlScreen = useIsWithinBreakpoints(['l', 'xl']);
  const showEmptyPrompt = !indicesExist;

  if (newDataViewPickerEnabled && status === 'pristine') {
    return <PageLoader />;
  }

  if (showEmptyPrompt) {
    return <EmptyPrompt />;
  }

  return (
    <>
      <FiltersGlobal>
        <SiemSearchBar
          dataView={dataView}
          id={InputsModelId.global}
          sourcererDataViewSpec={oldSourcererDataViewSpec}
        />
      </FiltersGlobal>

      <SecuritySolutionPageWrapper data-test-subj="entityAnalyticsHomePage">
        <HeaderPage
          title={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.homePage.pageTitle"
              defaultMessage="Entity Analytics"
            />
          }
          rightSideItems={[<WatchlistFilter />]}
        />

        {isSourcererLoading ? (
          <EuiLoadingSpinner size="l" data-test-subj="entityAnalyticsHomePageLoader" />
        ) : (
          <EuiFlexGroup direction="column" gutterSize="l">
            <EuiFlexItem>
              <EuiPanel hasBorder>
                <EuiFlexGroup
                  direction={isXlScreen ? 'row' : 'column'}
                  responsive={false}
                  gutterSize="l"
                >
                  <EuiFlexItem grow={1}>
                    <CombinedRiskDonutChart />
                  </EuiFlexItem>
                  <EuiFlexItem grow={1}>
                    <AnomaliesPlaceholderPanel />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>

            <EuiFlexItem>
              <EntityAnalyticsEntitiesTable />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.entityAnalyticsHomePage} />
    </>
  );
};

const EntityAnalyticsEntitiesTable = () => {
  const spaceId = useSpaceId();
  const { dataView: entityDataView, isLoading: entityDataViewLoading } =
    useEntityStoreDataView(spaceId);

  if (entityDataViewLoading || !entityDataView) {
    return <EuiLoadingSpinner size="l" data-test-subj="entityAnalyticsEntitiesTableLoader" />;
  }

  const dataViewContextValue = {
    dataView: entityDataView,
    dataViewIsLoading: entityDataViewLoading,
  };

  return (
    <DataViewContext.Provider value={dataViewContextValue}>
      <EntityAnalyticsEntitiesTableContent />
    </DataViewContext.Provider>
  );
};

const EntityAnalyticsEntitiesTableContent = () => {
  const state = useAssetInventoryURLState({
    paginationLocalStorageKey: ENTITY_ANALYTICS_LOCAL_STORAGE_PAGE_SIZE_KEY,
    columnsLocalStorageKey: ENTITY_ANALYTICS_LOCAL_STORAGE_COLUMNS_KEY,
    defaultQuery: getDefaultQuery,
  });

  const { openRightPanel, closeFlyout } = useExpandableFlyoutApi();
  const { investigateInTimeline } = useInvestigateInTimeline();
  const {
    timelinePrivileges: { read: canUseTimeline },
  } = useUserPrivileges();
  const { setQuery, deleteQuery } = useGlobalTime();
  const { isAgentBuilderEnabled } = useAgentBuilderAvailability();
  const { agentBuilder } = useKibana().services;

  const getEntityFields = useCallback((doc: DataTableRecord) => {
    const source = doc.raw._source as GenericEntityRecord | undefined;
    const entityType = (source?.entity?.EngineMetadata?.Type ??
      doc.flattened['entity.EngineMetadata.Type']) as EntityType | undefined;
    const entityName = (source?.entity?.name ?? doc.flattened['entity.name']) as string | undefined;
    return { entityType, entityName };
  }, []);

  const onDocumentOpen = useCallback(
    (doc: DataTableRecord) => {
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
    },
    [openRightPanel, getEntityFields]
  );

  const onDocumentClose = useCallback(() => {
    closeFlyout();
  }, [closeFlyout]);

  const additionalCustomRenderers = useCallback(
    (rows: DataTableRecord[]): CustomCellRenderer => ({
      alerts: ({ rowIndex }: EuiDataGridCellValueElementProps) => {
        const doc = rows[rowIndex];
        if (!doc) return null;
        const { entityType, entityName } = getEntityFields(doc);
        if (!entityName || !entityType) return null;
        return <EntityAlertsCell entityName={entityName} entityType={entityType} />;
      },
    }),
    [getEntityFields]
  );

  const getLeadingControlColumns = useCallback(
    (rows: DataTableRecord[]): EuiDataGridControlColumn[] => {
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
                  'xpack.securitySolution.entityAnalytics.homePage.investigateInTimeline',
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
                    'xpack.securitySolution.entityAnalytics.homePage.investigateInTimeline',
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
                  'xpack.securitySolution.entityAnalytics.homePage.aiInvestigationPrompt',
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
                  'xpack.securitySolution.entityAnalytics.homePage.addToChat',
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
                    'xpack.securitySolution.entityAnalytics.homePage.addToChat',
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
    },
    [canUseTimeline, investigateInTimeline, getEntityFields, isAgentBuilderEnabled, agentBuilder]
  );

  return (
    <AssetInventoryTableSection
      state={state}
      groupingOptions={ENTITY_ANALYTICS_GROUPING_OPTIONS}
      groupingLabelOverrides={ENTITY_ANALYTICS_GROUPING_LABEL_OVERRIDES}
      onDocumentOpen={onDocumentOpen}
      onDocumentClose={onDocumentClose}
      getLeadingControlColumns={getLeadingControlColumns}
      columnHeaderOverrides={ENTITY_ANALYTICS_COLUMN_HEADERS}
      rowTypeLabel={i18n.translate(
        'xpack.securitySolution.entityAnalytics.homePage.tableRowTypeLabel',
        { defaultMessage: 'entities' }
      )}
      inspectQueryId={ENTITY_ANALYTICS_TABLE_ID}
      inspectTitle={i18n.translate('xpack.securitySolution.entityAnalytics.homePage.inspectTitle', {
        defaultMessage: 'Entity analytics table',
      })}
      setQuery={setQuery}
      deleteQuery={deleteQuery}
      showLastUpdated
      defaultColumns={ENTITY_ANALYTICS_DEFAULT_COLUMNS}
      additionalCustomRenderers={additionalCustomRenderers}
    />
  );
};
