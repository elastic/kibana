/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  type EuiContextMenuPanelDescriptor,
} from '@elastic/eui';
import { GroupSelector } from '@kbn/grouping/src/components/group_selector';
import { css } from '@emotion/react';
import { kbnFullBodyHeightCss } from '@kbn/css-utils/public/full_body_height_css';
import { i18n } from '@kbn/i18n';
import { isNoneGroup } from '@kbn/grouping';
import { EntityType, useEntityStoreEuidApi } from '@kbn/entity-store/public';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import { PageLoader } from '../../common/components/page_loader';
import { SecurityPageName } from '../../app/types';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { EntitySearchBar } from '../components/home/entity_search_bar';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { useGlobalFilterQuery } from '../../common/hooks/use_global_filter_query';
import { useEntityStoreDataView } from '../components/home/use_entity_store_data_view';
import { DataViewErrorComponent } from '../../common/components/data_view_error';
import { useEntityStoreStatus } from '../components/entity_store/hooks/use_entity_store';
import { EntityStoreDisabledEmptyPrompt } from './entity_store_disabled_empty_prompt';
import { useMissingRiskEnginePrivileges } from '../hooks/use_missing_risk_engine_privileges';
import { useEntityEnginePrivileges } from '../components/entity_store/hooks/use_entity_engine_privileges';
import { useAnomalyPrivileges } from '../api/hooks/use_anomaly_privileges';
import { EntityAnalyticsReadPrivilegesCallout } from '../components/entity_analytics_read_privileges_callout';
import { NoPrivileges } from '../../common/components/no_privileges';
import { useUserPrivileges } from '../../common/components/user_privileges';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useGetWatchlists } from '../api/hooks/use_get_watchlists';
import { useErrorToast } from '../../common/hooks/use_error_toast';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import { DataViewContext } from '../components/home/entities_table';
import {
  EntitiesGroups,
  EntitiesGrid,
  useEntityAnalyticsUrlState,
  useSearchBarExpression,
  INDIVIDUAL_ROWS_COLUMNS,
  RESOLVED_ROWS_COLUMNS,
  getEntityId,
  getString,
  ENTITY_TYPE_FIELD,
} from '../components/home/entities_grid';
import { toDsl, toEsql } from '../components/home/entities_grid/active_filters';
import type { ActiveFilters } from '../components/home/entities_grid/active_filters';
import { useEntityFilterOverrides } from '../components/home/entities_grid/hooks/use_entity_grid_data';
import { isFilteringByGroupValue } from '../components/home/entities_grid/queries/resolved_entities';
import type {
  RowActions,
  CellHandlers,
  ReadAccess,
  Row,
  RowsMode,
} from '../components/home/entities_grid';
import { ENTITY_GROUPING_OPTIONS } from '../components/home/entities_table/constants';
import type { EntityURLStateResult } from '../components/home/entities_table/hooks/use_entity_url_state';
import { EntityFiltersBar } from '../components/home/entity_filters_bar';
import {
  EntityType as SecurityEntityType,
  EntityTypeToIdentifierField,
} from '../../../common/entity_analytics/types';
import { createDataProviders } from '../../app/actions/add_to_timeline/data_provider';
import { useInvestigateInTimeline } from '../../common/hooks/timeline/use_investigate_in_timeline';
import { useFlyoutApi } from '../../flyout_v2/use_flyout_api';
import type { EntityViewMode } from '../../../common/entity_analytics/entity_store/resolution_group';
import { FLYOUT_ORIGIN } from '../../common/lib/telemetry';
import { EntityAnalyticsHomeHeader } from './entity_analytics_home_header';
import { usePinnedBarsHeight } from '../components/home/use_pinned_bars_height';
import { GenerateAiBriefButton } from '../components/home/ai_brief/generate_ai_brief_button';
import { useKibana } from '../../common/lib/kibana';
import { APP_ID, SecurityAgentBuilderAttachments } from '../../../common/constants';
import { ENTITY_PROMPT } from '../../agent_builder/components/prompts';
import { useAgentBuilderAvailability } from '../../agent_builder/hooks/use_agent_builder_availability';
import { useReportAddToChat } from '../../agent_builder/hooks/use_report_add_to_chat';
import {
  useAlertBasedTiles,
  useAlertBasedTilesDelta,
  useAlertBasedTilesSeries,
  useEntitiesWithAnomaliesCount,
  useEntitiesWithAnomaliesDelta,
  useEntitiesWithAnomaliesSeries,
  useNewEntityCount,
  useNewEntityDelta,
  useNewEntitySeries,
  useNewlyHighCriticalCount,
  useNewlyHighCriticalDelta,
  useRiskMoversCount,
  useRiskMoversDelta,
  useRiskTilesSeries,
  useTilesLoadTelemetry,
  useTilesTimeoutNotice,
  TILE_TIMEOUT_MESSAGE,
} from '../components/home/needs_attention_tiles/hooks';
import { RISK_MOVER_MIN_SCORE_CHANGE } from '../components/home/needs_attention_tiles/queries/risk_history';
import { SignalCards } from '../components/home/needs_attention_tiles/signal_cards';
import { getEntityAnalyticsNewHomeScopeId } from '../common/scope_time_ranges';
import { HuntWithAiButton } from '../components/home/hunt_with_ai_button';
import {
  ProductTour,
  ProductTourBanner,
  ROWS_MODE_SELECTOR_TEST_ID,
  useProductTour,
} from '../components/home/product_tour';
import {
  MAX_TILE_FILTER_ENTITY_IDS,
  getCappedTileEntityIds,
} from '../components/home/needs_attention_tiles/tile_entity_filter';
import {
  EMPTY_ENTITY_IDS,
  type SignalCardData,
  type SignalCardId,
} from '../components/home/needs_attention_tiles/data';

const GROUP_BY_SETTINGS = { hideCustomFieldOption: false };

const hiddenCss = css`
  display: none;
`;

const isStoreEntityType = (value: unknown): value is EntityType =>
  EntityType.safeParse(value).success;

/** Host and user keep their type; every other entity type opens as generic. */
const toSecurityEntityType = (
  rawType: string | undefined
): SecurityEntityType.host | SecurityEntityType.user | SecurityEntityType.generic => {
  if (rawType === 'host') return SecurityEntityType.host;
  if (rawType === 'user') return SecurityEntityType.user;
  return SecurityEntityType.generic;
};

/** The entity a row stands for; a row without an id has nothing to open. */
const getRowEntity = (row: Row) => {
  const entityId = getEntityId(row);
  return entityId
    ? {
        entityId,
        entityName: getString(row, 'entity.name'),
        entityType: getString(row, ENTITY_TYPE_FIELD),
      }
    : undefined;
};

/** A resolved row stands for its whole group, so its flyouts show the group too. */
const getEntityViewMode = (rowsMode: RowsMode): EntityViewMode =>
  rowsMode === 'resolved' ? 'resolved' : 'single';

const ROWS_OPTIONS: ReadonlyArray<LabeledOption<RowsMode>> = [
  {
    key: 'resolved',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.rows.resolvedLabel', {
      defaultMessage: 'Resolved entities',
    }),
    description: i18n.translate(
      'xpack.securitySolution.entityAnalytics.home.rows.resolvedDescription',
      {
        defaultMessage: 'One row per resolved entity; its individual records are nested underneath',
      }
    ),
  },
  {
    key: 'individual',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.rows.individualLabel', {
      defaultMessage: 'Individual records',
    }),
    description: i18n.translate(
      'xpack.securitySolution.entityAnalytics.home.rows.individualDescription',
      {
        defaultMessage: 'One row per individual entity record; no resolution applied',
      }
    ),
  },
] as const;

const GROUP_BY_OPTIONS = [
  {
    key: ENTITY_GROUPING_OPTIONS.ENTITY_TYPE,
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.groupBy.entityTypeLabel', {
      defaultMessage: 'Entity type',
    }),
  },
  {
    key: ENTITY_GROUPING_OPTIONS.RESOLUTION,
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.groupBy.resolutionLabel', {
      defaultMessage: 'Resolution',
    }),
  },
] as const;

const GROUP_BY_SELECTOR_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.groupBySelector.title',
  { defaultMessage: 'Group by' }
);

const ROWS_SELECTOR_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.rowsSelector.title',
  { defaultMessage: 'Rows' }
);

const PAGE_TITLE = i18n.translate('xpack.securitySolution.entityAnalytics.homePage.pageTitle', {
  defaultMessage: 'Entity analytics',
});

const ML_GET_JOBS_PRIVILEGE = 'ui:ml/canGetJobs';

const NO_ALERTS_ACCESS_MESSAGE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.tiles.noAlertsAccess',
  { defaultMessage: 'Requires read access to alerts' }
);
const NO_ANOMALIES_ACCESS_MESSAGE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.tiles.noAnomaliesAccess',
  { defaultMessage: 'Requires read access to ML anomalies' }
);
const NO_RISK_ACCESS_MESSAGE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.tiles.noRiskAccess',
  { defaultMessage: 'Requires read access to risk scores' }
);

const getReadAccess = ({
  isLoading,
  isError,
  canRead,
}: {
  isLoading: boolean;
  isError: boolean;
  canRead: boolean | undefined;
}): boolean | undefined => {
  if (isError) return true;
  return isLoading ? undefined : canRead;
};

export const EntityAnalyticsNewHomePage: React.FC = () => {
  const riskEngineReadPrivileges = useMissingRiskEnginePrivileges({ readonly: true });
  const entityEnginePrivilegesQuery = useEntityEnginePrivileges();
  const anomalyPrivilegesQuery = useAnomalyPrivileges();
  const {
    detectionEnginePrivileges: { error: alertsPrivilegesError, result: alertsPrivilegesResult },
    timelinePrivileges: { read: canReadTimeline },
  } = useUserPrivileges();
  // `hasAlertsRead` needs both the Security > Alerts feature privilege and read on the alerts
  // index; `hasIndexRead` is null until the index privileges are known.
  const {
    hasIndexRead: hasAlertsIndexRead,
    hasAlertsRead,
    loading: isAlertsPrivilegesLoading,
  } = useAlertsPrivileges();
  const { cases } = useKibana().services;
  const { euiTheme } = useEuiTheme();

  // Index read without `hasAlertsRead` can only mean the Alerts feature privilege is missing. When
  // the index privilege is missing too, the callout already lists the index.
  const alertsFeatureMissing = hasAlertsIndexRead === true && hasAlertsRead === false;

  const alerts = getReadAccess({
    isLoading: isAlertsPrivilegesLoading,
    isError: alertsPrivilegesError != null,
    canRead: hasAlertsIndexRead == null ? undefined : hasAlertsRead,
  });
  const risk = getReadAccess({
    isLoading: riskEngineReadPrivileges.isLoading,
    isError: riskEngineReadPrivileges.isError ?? false,
    canRead:
      !riskEngineReadPrivileges.isLoading && riskEngineReadPrivileges.hasAllRequiredPrivileges,
  });
  const anomalies = getReadAccess({
    isLoading: anomalyPrivilegesQuery.isLoading,
    isError: anomalyPrivilegesQuery.isError,
    canRead:
      anomalyPrivilegesQuery.data?.has_read_permissions === true &&
      anomalyPrivilegesQuery.data.privileges.kibana?.[ML_GET_JOBS_PRIVILEGE] !== false,
  });
  // Users who can't read Security cases get no case counts: no Cases column, not zeros.
  const canReadCases = cases.helpers.canUseCases([APP_ID]).read;
  const readAccess = useMemo(
    (): ReadAccess => ({ alerts, risk, anomalies, cases: canReadCases }),
    [alerts, risk, anomalies, canReadCases]
  );

  const isRiskEngineReadPrivilegesLoading =
    riskEngineReadPrivileges.isLoading && !riskEngineReadPrivileges.isError;

  if (entityEnginePrivilegesQuery.isLoading || isRiskEngineReadPrivilegesLoading) {
    return <PageLoader />;
  }

  const noPrivileges =
    !entityEnginePrivilegesQuery.isError && !entityEnginePrivilegesQuery.data?.has_read_permissions;

  return (
    <>
      <div
        data-test-subj="entityAnalyticsPrivilegesCalloutWrapper"
        css={css`
          padding: ${euiTheme.size.base} ${euiTheme.size.base} 0;
          &:empty {
            display: none;
          }
        `}
      >
        <EntityAnalyticsReadPrivilegesCallout
          riskEngineReadPrivileges={riskEngineReadPrivileges}
          entityEnginePrivileges={entityEnginePrivilegesQuery.data}
          anomalyPrivileges={anomalyPrivilegesQuery.data}
          alertsIndexPrivileges={alertsPrivilegesResult?.index}
          alertsFeatureMissing={alertsFeatureMissing}
          id="entity-analytics-home"
        />
      </div>
      {noPrivileges ? (
        <>
          <SecuritySolutionPageWrapper data-test-subj="entityAnalyticsNewHomePage">
            <NoPrivileges
              pageName={PAGE_TITLE.toLowerCase()}
              docLinkSelector={(docLinks) =>
                docLinks.securitySolution.entityAnalytics.riskScorePrerequisites
              }
            />
          </SecuritySolutionPageWrapper>
          <SpyRoute pageName={SecurityPageName.entityAnalyticsHomePage} />
        </>
      ) : (
        <EntityAnalyticsNewHomePageContent
          readAccess={readAccess}
          canReadTimeline={canReadTimeline}
        />
      )}
    </>
  );
};

const EntityAnalyticsNewHomePageContent: React.FC<{
  readAccess: ReadAccess;
  canReadTimeline: boolean;
}> = ({ readAccess, canReadTimeline }) => {
  const spaceId = useSpaceId();
  const {
    dataView,
    isLoading: isDataViewLoading,
    error: isDataViewError,
  } = useEntityStoreDataView(spaceId);
  const { euiTheme } = useEuiTheme();
  const { addWarning } = useAppToasts();
  const {
    openEntityFlyout,
    openEntityResolution,
    openEntityAlertsInsights,
    openEntityAnomalyInsights,
    openEntityGraphView,
  } = useFlyoutApi();
  const { investigateInTimeline } = useInvestigateInTimeline();
  const euidApi = useEntityStoreEuidApi();
  const { agentBuilder } = useKibana().services;
  const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();
  const reportAddToChat = useReportAddToChat();
  const {
    timeRange,
    setTimeRange,
    entityFilters,
    setEntityFilters,
    groupsSelected,
    setGroupsSelected,
    rowsMode,
    setRowsMode,
    sortField,
    sortDirection,
    setSort,
    activeTile,
    setActiveTile,
  } = useEntityAnalyticsUrlState();
  const productTour = useProductTour();
  // The scope pins every time-bounded section of the flyouts opened from here (alerts, observed
  // data, anomalies, highlights, graph) to the selected range — see `SCOPE_FLYOUT_TIME_RANGES`.
  const scopeId = getEntityAnalyticsNewHomeScopeId(timeRange);

  const [isGridFullScreen, setIsGridFullScreen] = useState(false);
  const [pinnedBarsHeight, gridAreaRef] = usePinnedBarsHeight(isGridFullScreen);

  const activeColumns = rowsMode === 'individual' ? INDIVIDUAL_ROWS_COLUMNS : RESOLVED_ROWS_COLUMNS;

  const cellHandlers = useMemo<CellHandlers>(
    () => ({
      onEntityNameClick: (row, rowMode) => {
        const entity = getRowEntity(row);
        if (!entity) return;
        openEntityFlyout({
          entityId: entity.entityId,
          entityName: entity.entityName,
          engineType: entity.entityType,
          scopeId,
          contextID: scopeId,
          origin: FLYOUT_ORIGIN.ENTITIES_TABLE,
          mode: getEntityViewMode(rowMode),
        });
      },
      onGroupSizeClick: (row) => {
        const entity = getRowEntity(row);
        if (!entity || !isStoreEntityType(entity.entityType)) return;
        openEntityResolution({
          entityId: entity.entityId,
          entityName: entity.entityName ?? '',
          entityType: entity.entityType,
          scopeId,
        });
      },
      onAlertCountClick: (row, rowMode) => {
        const entity = getRowEntity(row);
        if (!entity) return;
        const entityType = toSecurityEntityType(entity.entityType);
        openEntityAlertsInsights({
          entityType,
          value:
            entityType === SecurityEntityType.generic ? entity.entityId : entity.entityName ?? '',
          entityId: entity.entityId,
          scopeId,
          mode: getEntityViewMode(rowMode),
        });
      },
      onAnomalyCountClick: (row, rowMode) => {
        const entity = getRowEntity(row);
        const entityType = toSecurityEntityType(entity?.entityType);
        if (!entity || entityType === SecurityEntityType.generic) return;
        openEntityAnomalyInsights({
          entityType,
          value: entity.entityName ?? '',
          entityId: entity.entityId,
          scopeId,
          mode: getEntityViewMode(rowMode),
        });
      },
    }),
    [
      openEntityFlyout,
      openEntityResolution,
      openEntityAlertsInsights,
      openEntityAnomalyInsights,
      scopeId,
    ]
  );

  const rowActions = useMemo<RowActions>(
    () => ({
      onInvestigateInTimeline: canReadTimeline
        ? (row) => {
            const entity = getRowEntity(row);
            if (!entity?.entityName || !isStoreEntityType(entity.entityType)) return;
            const kqlFilter = euidApi?.euid.kql.getEuidFilterBasedOnDocument(
              euidApi.getBuiltInEntityDefinition(entity.entityType),
              row
            );
            if (kqlFilter) {
              investigateInTimeline({ query: { query: kqlFilter, language: 'kuery' } });
              return;
            }
            const field = EntityTypeToIdentifierField[entity.entityType] ?? 'entity.id';
            const dataProviders = createDataProviders({
              contextId: scopeId,
              field,
              values: entity.entityName,
            });
            if (dataProviders?.length) investigateInTimeline({ dataProviders });
          }
        : undefined,
      onOpenEntityGraph: (row) => {
        const entity = getRowEntity(row);
        if (!entity) return;
        openEntityGraphView({
          entityId: entity.entityId,
          entityName: entity.entityName ?? '',
          scopeId,
          onShowEntity: ({ engineType, entityId: relatedId, entityName: relatedName }) => {
            openEntityFlyout({
              engineType,
              entityId: relatedId,
              entityName: relatedName,
              scopeId,
            });
          },
        });
      },
      onAddToChat: isAgentChatExperienceEnabled
        ? (row) => {
            const entity = getRowEntity(row);
            if (!entity?.entityName || !isStoreEntityType(entity.entityType)) return;
            const { entityId, entityName, entityType } = entity;
            reportAddToChat({ pathway: 'entities_grid_row_actions', attachments: ['entity'] });
            agentBuilder?.openChat({
              newConversation: true,
              initialMessage: ENTITY_PROMPT,
              sessionTag: 'security',
              attachments: [
                {
                  id: `${SecurityAgentBuilderAttachments.entity}-${entityId}`,
                  type: SecurityAgentBuilderAttachments.entity,
                  data: {
                    identifierType: entityType,
                    identifier: entityName,
                    entityStoreId: entityId,
                    attachmentLabel: `${entityType}: ${entityName}`,
                  },
                },
              ],
            });
          }
        : undefined,
    }),
    [
      agentBuilder,
      canReadTimeline,
      euidApi,
      investigateInTimeline,
      isAgentChatExperienceEnabled,
      openEntityGraphView,
      openEntityFlyout,
      reportAddToChat,
      scopeId,
    ]
  );

  const { filterQuery: esFilter } = useGlobalFilterQuery({ dataView });
  const searchExpression = useSearchBarExpression();

  const { data: watchlistsData, error: watchlistsError } = useGetWatchlists();
  useErrorToast(
    i18n.translate('xpack.securitySolution.entityAnalytics.home.watchlists.queryError', {
      defaultMessage: 'There was an error loading watchlists',
    }),
    watchlistsError
  );
  const watchlistNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of watchlistsData ?? []) {
      if (w.id) map.set(w.id, w.name);
    }
    return map;
  }, [watchlistsData]);

  const [groupingPageIndex, setGroupingPageIndex] = useState(0);
  const [groupingPageSize, setGroupingPageSize] = useState(25);

  const isGroupSelected = !isNoneGroup(groupsSelected);

  const { data: entityStoreStatusData, isLoading: entityStoreStatusLoading } =
    useEntityStoreStatus();
  const entityStoreDisabled =
    entityStoreStatusData?.status === 'not_installed' ||
    entityStoreStatusData?.status === 'stopped';
  const entityStoreInstalling = entityStoreStatusData?.status === 'installing';
  // Hooks must run before the disabled-prompt return. Skip ES|QL until the store
  // is known to be running so we do not query a missing entities-latest alias.
  const skipTileQueries =
    !spaceId || entityStoreStatusLoading || entityStoreDisabled || entityStoreInstalling;

  const resolvedSpaceId = spaceId ?? 'default';
  const skipAlertTiles = skipTileQueries || !readAccess.alerts;
  const skipAnomaliesTile = skipTileQueries || !readAccess.anomalies;
  const skipRiskTiles = skipTileQueries || !readAccess.risk;
  const canReadAlerts = readAccess.alerts !== false;
  const canReadAnomalies = readAccess.anomalies !== false;
  const canReadRisk = readAccess.risk !== false;

  const {
    severeAlertsCount,
    severeAlertsEntityIds,
    watchlistedCount,
    watchlistedEntityIds,
    hasCount: alertBasedHasCount,
    isLoading: alertBasedLoading,
    isCountPending: alertBasedPending,
    isTimedOut: alertBasedTimedOut,
    error: alertBasedError,
  } = useAlertBasedTiles({
    spaceId: resolvedSpaceId,
    timeRange,
    entityFilters,
    skip: skipAlertTiles,
  });
  const {
    count: anomaliesCount,
    entityIds: anomaliesEntityIds,
    hasCount: anomaliesHasCount,
    isLoading: anomaliesLoading,
    isMissingJobs: anomaliesMissingJobs,
    isCountPending: anomaliesPending,
    isTimedOut: anomaliesTimedOut,
    error: anomaliesError,
  } = useEntitiesWithAnomaliesCount({
    spaceId: resolvedSpaceId,
    timeRange,
    entityFilters,
    skip: skipAnomaliesTile,
  });
  const {
    count: newEntityCount,
    entityIds: newEntityEntityIds,
    hasCount: newEntityHasCount,
    isLoading: newEntityLoading,
    isCountPending: newEntityPending,
    isTimedOut: newEntityTimedOut,
    error: newEntityError,
  } = useNewEntityCount({
    spaceId: resolvedSpaceId,
    timeRange,
    entityFilters,
    skip: skipTileQueries,
  });
  const {
    count: riskMoversCount,
    entityIds: riskMoversEntityIds,
    hasCount: riskMoversHasCount,
    isLoading: riskMoversLoading,
    isMissingIndex: riskMoversMissingIndex,
    isCountPending: riskMoversPending,
    isTimedOut: riskMoversTimedOut,
    error: riskMoversError,
  } = useRiskMoversCount({
    spaceId: resolvedSpaceId,
    timeRange,
    entityFilters,
    skip: skipRiskTiles,
  });
  const {
    count: newlyHCCount,
    entityIds: newlyHCEntityIds,
    hasCount: newlyHCHasCount,
    isLoading: newlyHCLoading,
    isMissingIndex: newlyHCMissingIndex,
    isCountPending: newlyHCPending,
    isTimedOut: newlyHCTimedOut,
    error: newlyHCError,
  } = useNewlyHighCriticalCount({
    spaceId: resolvedSpaceId,
    timeRange,
    entityFilters,
    skip: skipRiskTiles,
  });

  // Count first, then each tile on its own: a tile's delta starts once its own count has loaded (a
  // count whose query cannot run is not waited for), so a slow count delays only its own tile.
  const deltaOptions = {
    spaceId: resolvedSpaceId,
    timeRange,
    entityFilters,
    skip: skipTileQueries,
  };
  const {
    severeAlertsDelta: alertsDelta,
    watchlistedDelta,
    severeAlertsPrevious,
    watchlistedPrevious,
    isDeltaLoading,
    isHistoryMissing: alertBasedHistoryMissing,
    reachesBack: alertBasedReachesBack,
  } = useAlertBasedTilesDelta({
    ...deltaOptions,
    isReady: !alertBasedPending,
    skip: skipAlertTiles,
    severeAlertsCount,
    watchlistedCount,
  });
  const {
    delta: anomaliesDelta,
    previous: anomaliesPrevious,
    isDeltaLoading: anomaliesDeltaLoading,
    isHistoryMissing: anomaliesHistoryMissing,
    reachesBack: anomaliesReachesBack,
  } = useEntitiesWithAnomaliesDelta({
    ...deltaOptions,
    isReady: !anomaliesPending,
    skip: skipAnomaliesTile,
    count: anomaliesCount,
  });
  const {
    delta: newEntityDelta,
    previous: newEntityPrevious,
    isDeltaLoading: newEntityDeltaLoading,
    isHistoryMissing: newEntityHistoryMissing,
    reachesBack: newEntityReachesBack,
  } = useNewEntityDelta({ ...deltaOptions, isReady: !newEntityPending, count: newEntityCount });
  const {
    delta: riskMoversDelta,
    previous: riskMoversPrevious,
    isDeltaLoading: riskMoversDeltaLoading,
    isHistoryMissing: riskMoversHistoryMissing,
    reachesBack: riskMoversReachesBack,
  } = useRiskMoversDelta({
    ...deltaOptions,
    skip: skipRiskTiles,
    isReady: !riskMoversPending,
    count: riskMoversCount,
  });
  const {
    delta: newlyHCDelta,
    previous: newlyHCPrevious,
    isDeltaLoading: newlyHCDeltaLoading,
    isHistoryMissing: newlyHCHistoryMissing,
    reachesBack: newlyHCReachesBack,
  } = useNewlyHighCriticalDelta({
    ...deltaOptions,
    skip: skipRiskTiles,
    isReady: !newlyHCPending,
    count: newlyHCCount,
  });

  // The sparklines follow the deltas: each starts once its own counts and deltas have settled, and
  // only for a tile whose history reaches back twice the range, so they never delay them.
  const {
    alertsTrend,
    watchlistedTrend,
    isTrendLoading: alertBasedTrendLoading,
  } = useAlertBasedTilesSeries({
    ...deltaOptions,
    skip: skipAlertTiles,
    isReady: !alertBasedPending && !isDeltaLoading,
    reachesBack: alertBasedReachesBack,
    severeAlertsCount,
    watchlistedCount,
    severeAlertsBaseline: severeAlertsPrevious,
    watchlistedBaseline: watchlistedPrevious,
  });
  const { trend: anomaliesTrend, isTrendLoading: anomaliesTrendLoading } =
    useEntitiesWithAnomaliesSeries({
      ...deltaOptions,
      skip: skipAnomaliesTile,
      isReady: !anomaliesPending && !anomaliesDeltaLoading,
      reachesBack: anomaliesReachesBack,
      count: anomaliesCount,
      deltaBaseline: anomaliesPrevious,
    });
  const { trend: newEntityTrend, isTrendLoading: newEntityTrendLoading } = useNewEntitySeries({
    ...deltaOptions,
    isReady: !newEntityPending && !newEntityDeltaLoading,
    reachesBack: newEntityReachesBack,
    count: newEntityCount,
    deltaBaseline: newEntityPrevious,
  });
  // The two risk tiles read the same risk score history, so one query serves both sparklines: it
  // waits for both risk tiles.
  const {
    riskMoversTrend,
    newlyHighCriticalTrend: newlyHCTrend,
    isTrendLoading: riskTrendLoading,
  } = useRiskTilesSeries({
    ...deltaOptions,
    skip: skipRiskTiles,
    isReady:
      !riskMoversPending && !newlyHCPending && !riskMoversDeltaLoading && !newlyHCDeltaLoading,
    riskMoversReachesBack,
    newlyHighCriticalReachesBack: newlyHCReachesBack,
    riskMoversCount,
    newlyHighCriticalCount: newlyHCCount,
    riskMoversBaseline: riskMoversPrevious,
    newlyHighCriticalBaseline: newlyHCPrevious,
  });

  // A new range or filter is a new page load for the timeout notice and the load telemetry.
  const tilesRunKey = `${timeRange}:${JSON.stringify(entityFilters)}`;
  useTilesTimeoutNotice(
    alertBasedTimedOut ||
      anomaliesTimedOut ||
      newEntityTimedOut ||
      riskMoversTimedOut ||
      newlyHCTimedOut,
    tilesRunKey
  );
  const tileLoadState = (
    countPending: boolean,
    deltaLoading: boolean,
    trendLoading: boolean,
    timedOut: boolean,
    error: unknown
  ) => ({
    isCountPending: countPending,
    isDeltaLoading: deltaLoading,
    isTrendLoading: trendLoading,
    isTimedOut: timedOut,
    hasError: Boolean(error),
  });
  useTilesLoadTelemetry({
    skip: skipTileQueries,
    runKey: tilesRunKey,
    timeRange,
    hasEntityFilters: Object.values(entityFilters).some((values) => values.length > 0),
    tiles: {
      alerts: tileLoadState(
        alertBasedPending,
        isDeltaLoading,
        alertBasedTrendLoading,
        alertBasedTimedOut,
        alertBasedError
      ),
      anomalies: tileLoadState(
        anomaliesPending,
        anomaliesDeltaLoading,
        anomaliesTrendLoading,
        anomaliesTimedOut,
        anomaliesError
      ),
      newEntity: tileLoadState(
        newEntityPending,
        newEntityDeltaLoading,
        newEntityTrendLoading,
        newEntityTimedOut,
        newEntityError
      ),
      riskMovers: tileLoadState(
        riskMoversPending,
        riskMoversDeltaLoading,
        riskTrendLoading,
        riskMoversTimedOut,
        riskMoversError
      ),
      newlyHighCritical: tileLoadState(
        newlyHCPending,
        newlyHCDeltaLoading,
        riskTrendLoading,
        newlyHCTimedOut,
        newlyHCError
      ),
    },
  });

  const handleFilterForCard = useCallback(
    (cardId: SignalCardId) => {
      setActiveTile(activeTile === cardId ? null : cardId);
    },
    [activeTile, setActiveTile]
  );

  const selectedEntityIds = useMemo(() => {
    if (!activeTile) {
      return EMPTY_ENTITY_IDS;
    }
    switch (activeTile) {
      case 'entitiesWithAlerts':
        return severeAlertsEntityIds;
      case 'entitiesWithAnomalies':
        return anomaliesEntityIds;
      case 'riskMovers':
        return riskMoversEntityIds;
      case 'newlyHighCritical':
        return newlyHCEntityIds;
      case 'watchlisted':
        return watchlistedEntityIds;
      case 'newEntity':
        return newEntityEntityIds;
      default:
        return EMPTY_ENTITY_IDS;
    }
  }, [
    activeTile,
    severeAlertsEntityIds,
    anomaliesEntityIds,
    riskMoversEntityIds,
    newlyHCEntityIds,
    watchlistedEntityIds,
    newEntityEntityIds,
  ]);

  const cappedTileEntityIds = useMemo(
    () => (activeTile ? getCappedTileEntityIds(selectedEntityIds) : null),
    [activeTile, selectedEntityIds]
  );

  const activeFilters = useMemo(
    (): ActiveFilters => ({
      search: { esql: searchExpression, dsl: esFilter },
      entityFilters,
      tileEntityIds: cappedTileEntityIds,
      rowsMode,
    }),
    [searchExpression, esFilter, entityFilters, cappedTileEntityIds, rowsMode]
  );
  // Strings, so a tile refetch with the same entities doesn't reset the pages below.
  const { searchExpression: gridSearchExpression, entityExpression: gridEntityExpression } =
    useMemo(() => toEsql(activeFilters), [activeFilters]);
  // Group by reads the grid's rows with DSL, so it takes the overrides the grid's filters read.
  const { data: entityFilterOverrides } = useEntityFilterOverrides({
    rowsMode,
    entityExpression: gridEntityExpression,
  });
  const isGroupingQueryReady =
    !isFilteringByGroupValue({ rowsMode, entityExpression: gridEntityExpression }) ||
    entityFilterOverrides != null;
  const groupingQuery = useMemo(
    () => toDsl(activeFilters, entityFilterOverrides),
    [activeFilters, entityFilterOverrides]
  );

  const groupingState = useMemo<EntityURLStateResult>(
    () => ({
      query: groupingQuery ?? {
        bool: { filter: [], must: [], should: [], must_not: [] },
      },
      setUrlQuery: () => {},
      pageSize: groupingPageSize,
      pageIndex: groupingPageIndex,
      onChangePage: setGroupingPageIndex,
      onChangeItemsPerPage: setGroupingPageSize,
      sort: [],
      filters: [],
      onSort: () => {},
      onResetFilters: () => {},
      getRowsFromPages: () => [],
    }),
    [groupingQuery, groupingPageSize, groupingPageIndex]
  );

  useUpdateEffect(() => {
    setGroupingPageIndex(0);
  }, [gridSearchExpression, gridEntityExpression, rowsMode]);

  useUpdateEffect(() => {
    if (!activeTile || selectedEntityIds.length <= MAX_TILE_FILTER_ENTITY_IDS) {
      return;
    }
    addWarning({
      title: i18n.translate(
        'xpack.securitySolution.entityAnalytics.home.tiles.cardFilterLimitTitle',
        {
          defaultMessage: 'Table shows {limit} of {count} entities',
          values: { limit: MAX_TILE_FILTER_ENTITY_IDS, count: selectedEntityIds.length },
        }
      ),
      text: i18n.translate(
        'xpack.securitySolution.entityAnalytics.home.tiles.cardFilterLimitDescription',
        {
          defaultMessage:
            'The table is limited to {limit} entities from this tile. Narrow the time range or filters to see a smaller set.',
          values: { limit: MAX_TILE_FILTER_ENTITY_IDS },
        }
      ),
    });
  }, [activeTile, selectedEntityIds.length, addWarning]);

  const signalCards = useMemo(
    (): SignalCardData[] => [
      {
        id: 'entitiesWithAlerts',
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.entitiesWithAlerts.title',
          {
            defaultMessage: 'Severely alerting',
          }
        ),
        value: severeAlertsCount,
        delta: alertsDelta,
        isDeltaLoading,
        isDeltaUnavailable: alertBasedHistoryMissing,
        trend: alertsTrend,
        isLoading: alertBasedLoading,
        hasCount: alertBasedHasCount,
        entityIds: severeAlertsEntityIds,
        isUnavailable: Boolean(alertBasedError),
        noDataMessage: !canReadAlerts
          ? NO_ALERTS_ACCESS_MESSAGE
          : alertBasedTimedOut
          ? TILE_TIMEOUT_MESSAGE
          : undefined,
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.entitiesWithAlerts.description',
          {
            defaultMessage: 'Have at least one high- or critical-severity alert',
          }
        ),
        filterLabel: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.entitiesWithAlerts.filterLabel',
          {
            defaultMessage: 'Entities with alerts ({timeRange})',
            values: { timeRange },
          }
        ),
      },
      {
        id: 'entitiesWithAnomalies',
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.entitiesWithAnomalies.title',
          {
            defaultMessage: 'Anomalous',
          }
        ),
        value: anomaliesCount,
        delta: anomaliesDelta,
        isDeltaLoading: anomaliesDeltaLoading,
        isDeltaUnavailable: anomaliesHistoryMissing,
        trend: anomaliesTrend,
        isLoading: anomaliesLoading,
        hasCount: anomaliesHasCount,
        entityIds: anomaliesEntityIds,
        // Without ML jobs the tile shows 0, which isn't a real count.
        isUnavailable: Boolean(anomaliesError) || anomaliesMissingJobs,
        noDataMessage: !canReadAnomalies
          ? NO_ANOMALIES_ACCESS_MESSAGE
          : anomaliesTimedOut
          ? TILE_TIMEOUT_MESSAGE
          : anomaliesMissingJobs
          ? i18n.translate(
              'xpack.securitySolution.entityAnalytics.home.tiles.entitiesWithAnomalies.noJobs',
              { defaultMessage: 'Requires anomaly detection jobs' }
            )
          : undefined,
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.entitiesWithAnomalies.description',
          {
            defaultMessage: 'Flagged by at least one ML anomaly',
          }
        ),
        filterLabel: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.entitiesWithAnomalies.filterLabel',
          {
            defaultMessage: 'Entities with anomalies ({timeRange})',
            values: { timeRange },
          }
        ),
      },
      {
        id: 'riskMovers',
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.riskMovers.title',
          {
            defaultMessage: 'Risk movers',
          }
        ),
        value: riskMoversCount,
        delta: riskMoversDelta,
        isDeltaLoading: riskMoversDeltaLoading,
        isDeltaUnavailable: riskMoversHistoryMissing,
        trend: riskMoversTrend,
        isLoading: riskMoversLoading,
        hasCount: riskMoversHasCount,
        entityIds: riskMoversEntityIds,
        isUnavailable: Boolean(riskMoversError),
        noDataMessage: !canReadRisk
          ? NO_RISK_ACCESS_MESSAGE
          : riskMoversTimedOut
          ? TILE_TIMEOUT_MESSAGE
          : riskMoversMissingIndex
          ? i18n.translate('xpack.securitySolution.entityAnalytics.home.tiles.riskMovers.noData', {
              defaultMessage: 'Requires risk score history data',
            })
          : undefined,
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.riskMovers.description',
          {
            defaultMessage: 'Risk score up by {points} or more',
            values: { points: RISK_MOVER_MIN_SCORE_CHANGE },
          }
        ),
        filterLabel: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.riskMovers.filterLabel',
          {
            defaultMessage: 'Risk movers',
          }
        ),
      },
      {
        id: 'newlyHighCritical',
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.newlyHighCritical.title',
          {
            defaultMessage: 'Newly high-risk',
          }
        ),
        value: newlyHCCount,
        delta: newlyHCDelta,
        isDeltaLoading: newlyHCDeltaLoading,
        isDeltaUnavailable: newlyHCHistoryMissing,
        trend: newlyHCTrend,
        isLoading: newlyHCLoading,
        hasCount: newlyHCHasCount,
        entityIds: newlyHCEntityIds,
        isUnavailable: Boolean(newlyHCError),
        noDataMessage: !canReadRisk
          ? NO_RISK_ACCESS_MESSAGE
          : newlyHCTimedOut
          ? TILE_TIMEOUT_MESSAGE
          : newlyHCMissingIndex
          ? i18n.translate(
              'xpack.securitySolution.entityAnalytics.home.tiles.newlyHighCritical.noData',
              {
                defaultMessage: 'Requires risk score history data',
              }
            )
          : undefined,
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.newlyHighCritical.description',
          {
            defaultMessage: 'Risk level climbed to high or critical',
          }
        ),
        filterLabel: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.newlyHighCritical.filterLabel',
          {
            defaultMessage: 'Newly high/critical',
          }
        ),
      },
      {
        id: 'watchlisted',
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.watchlisted.title',
          {
            defaultMessage: 'Watchlisted & alerting',
          }
        ),
        value: watchlistedCount,
        delta: watchlistedDelta,
        isDeltaLoading,
        isDeltaUnavailable: alertBasedHistoryMissing,
        trend: watchlistedTrend,
        isLoading: alertBasedLoading,
        hasCount: alertBasedHasCount,
        entityIds: watchlistedEntityIds,
        isUnavailable: Boolean(alertBasedError),
        noDataMessage: !canReadAlerts
          ? NO_ALERTS_ACCESS_MESSAGE
          : alertBasedTimedOut
          ? TILE_TIMEOUT_MESSAGE
          : undefined,
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.watchlisted.description',
          {
            defaultMessage: 'On a watchlist with at least one alert in this period',
          }
        ),
        filterLabel: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.watchlisted.filterLabel',
          {
            defaultMessage: 'Watchlisted',
          }
        ),
      },
      {
        id: 'newEntity',
        title: i18n.translate('xpack.securitySolution.entityAnalytics.home.tiles.newEntity.title', {
          defaultMessage: 'New & alerting',
        }),
        value: newEntityCount,
        delta: newEntityDelta,
        isDeltaLoading: newEntityDeltaLoading,
        isDeltaUnavailable: newEntityHistoryMissing,
        trend: newEntityTrend,
        isLoading: newEntityLoading,
        hasCount: newEntityHasCount,
        entityIds: newEntityEntityIds,
        isUnavailable: Boolean(newEntityError),
        noDataMessage: newEntityTimedOut ? TILE_TIMEOUT_MESSAGE : undefined,
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.newEntity.description',
          {
            defaultMessage: 'First seen in this period with at least one alert',
          }
        ),
        filterLabel: i18n.translate(
          'xpack.securitySolution.entityAnalytics.home.tiles.newEntity.filterLabel',
          {
            defaultMessage: 'New entity (last {timeRange})',
            values: { timeRange },
          }
        ),
      },
    ],
    [
      severeAlertsEntityIds,
      anomaliesEntityIds,
      riskMoversEntityIds,
      newlyHCEntityIds,
      watchlistedEntityIds,
      newEntityEntityIds,
      alertBasedError,
      anomaliesError,
      riskMoversError,
      newlyHCError,
      newEntityError,
      canReadAlerts,
      canReadAnomalies,
      canReadRisk,
      severeAlertsCount,
      alertsDelta,
      alertsTrend,
      alertBasedLoading,
      alertBasedTimedOut,
      isDeltaLoading,
      alertBasedHistoryMissing,
      anomaliesCount,
      anomaliesDelta,
      anomaliesTrend,
      anomaliesDeltaLoading,
      anomaliesHistoryMissing,
      anomaliesLoading,
      anomaliesTimedOut,
      anomaliesMissingJobs,
      riskMoversCount,
      riskMoversDelta,
      riskMoversTrend,
      riskMoversDeltaLoading,
      riskMoversHistoryMissing,
      riskMoversLoading,
      riskMoversTimedOut,
      newlyHCCount,
      newlyHCDelta,
      newlyHCTrend,
      newlyHCDeltaLoading,
      newlyHCHistoryMissing,
      newlyHCLoading,
      newlyHCTimedOut,
      newlyHCMissingIndex,
      watchlistedCount,
      watchlistedDelta,
      watchlistedTrend,
      newEntityCount,
      newEntityDelta,
      newEntityTrend,
      newEntityDeltaLoading,
      newEntityHistoryMissing,
      newEntityLoading,
      newEntityTimedOut,
      riskMoversMissingIndex,
      alertBasedHasCount,
      anomaliesHasCount,
      riskMoversHasCount,
      newlyHCHasCount,
      newEntityHasCount,
      timeRange,
    ]
  );

  const onGroupChange = useCallback(
    (key: string) => {
      if (key === 'none') return setGroupsSelected(['none']);
      const cleaned = groupsSelected.filter((g) => g !== 'none');
      setGroupsSelected(
        cleaned.includes(key) ? cleaned.filter((g) => g !== key) : [...cleaned, key]
      );
    },
    [groupsSelected, setGroupsSelected]
  );

  const groupByOptions = useMemo(() => {
    const options: Array<{ key: string; label: string }> = GROUP_BY_OPTIONS.filter(
      (o) => !(rowsMode === 'resolved' && o.key === ENTITY_GROUPING_OPTIONS.RESOLUTION)
    );
    // The selector names a selection only from its options, so a custom field joins them, as in kbn-grouping.
    const customFields = groupsSelected
      .filter((key) => key !== 'none' && !options.some((o) => o.key === key))
      .map((key) => ({ key, label: key }));
    return [...options, ...customFields];
  }, [rowsMode, groupsSelected]);
  const groupByFields = useMemo(
    () => (isDataViewLoading ? [] : dataView.fields.getAll()),
    [isDataViewLoading, dataView]
  );

  // Memoized: the grid toolbar rebuilds whenever this element changes.
  const tableControls = useMemo(
    () => (
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <LabeledOptionSelector
            title={ROWS_SELECTOR_TITLE}
            options={ROWS_OPTIONS}
            selectedKey={rowsMode}
            onChange={setRowsMode}
            data-test-subj={ROWS_MODE_SELECTOR_TEST_ID}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <GroupSelector
            groupingId="ea-new-home-group-by"
            groupsSelected={groupsSelected}
            onGroupChange={onGroupChange}
            options={groupByOptions}
            fields={groupByFields}
            title={GROUP_BY_SELECTOR_TITLE}
            maxGroupingLevels={3}
            settings={GROUP_BY_SETTINGS}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [rowsMode, setRowsMode, groupsSelected, onGroupChange, groupByOptions, groupByFields]
  );

  const dataViewContextValue = useMemo(
    () => ({ dataView, dataViewIsLoading: isDataViewLoading }),
    [dataView, isDataViewLoading]
  );

  if (isDataViewLoading || entityStoreStatusLoading || entityStoreInstalling) return <PageLoader />;
  if (isDataViewError) return <DataViewErrorComponent />;
  if (entityStoreDisabled) return <EntityStoreDisabledEmptyPrompt />;

  return (
    <>
      {/* Unwrapped: a wrapper would stop the header from sticking. */}
      {!isGridFullScreen && <EntityAnalyticsHomeHeader onStartTour={productTour.startTour} />}
      <SecuritySolutionPageWrapper noPadding data-test-subj="entityAnalyticsNewHomePage">
        <div
          className="entityAnalyticsSearchSection"
          css={[
            css`
              padding-block-start: ${euiTheme.size.s};
              padding-inline: ${euiTheme.size.base};
              display: flex;
              flex-direction: column;
              height: 100%;
            `,
            isGridFullScreen && hiddenCss,
          ]}
        >
          {productTour.isBannerVisible && (
            <>
              <ProductTourBanner
                onStartTour={productTour.startTour}
                onDismiss={productTour.dismissBanner}
              />
              <EuiSpacer size="m" />
            </>
          )}
          {/* SiemSearchBar has internal left padding; pull it left so its content aligns with the page edge */}
          <div
            css={css`
              margin-inline-start: -${euiTheme.size.s};
            `}
          >
            <EntitySearchBar
              dataView={dataView}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </div>

          <EuiSpacer size="s" />

          <EntityFiltersBar
            filters={entityFilters}
            onFiltersChange={setEntityFilters}
            spaceId={spaceId}
            rowsMode={rowsMode}
            esFilter={esFilter}
            watchlistNames={watchlistNames}
          />

          <EuiSpacer size="m" />

          <div>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <GenerateAiBriefButton
                  cards={signalCards}
                  timeRange={timeRange}
                  entityFilters={entityFilters}
                  focusTileId={activeTile ?? undefined}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <HuntWithAiButton />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <SignalCards
              activeTile={activeTile}
              cards={signalCards}
              onFilterForCard={handleFilterForCard}
            />
          </div>
        </div>

        <EuiSpacer size="m" />

        <div
          ref={gridAreaRef}
          css={[
            css`
              padding-inline: ${euiTheme.size.base};
            `,
            // Scrolled to, the grid fills the view between the pinned bars; groups keep their
            // natural height.
            !isGroupSelected && kbnFullBodyHeightCss(`${pinnedBarsHeight}px`),
          ]}
        >
          <DataViewContext.Provider value={dataViewContextValue}>
            {isGroupSelected ? (
              <EntitiesGroups
                state={groupingState}
                groupsSelected={groupsSelected}
                timeRange={timeRange}
                watchlistNames={watchlistNames}
                rowsMode={rowsMode}
                searchExpression={gridSearchExpression}
                entityExpression={gridEntityExpression}
                isQueryReady={isGroupingQueryReady}
                groupSelectorComponent={tableControls}
                cellHandlers={cellHandlers}
                rowActions={rowActions}
                readAccess={readAccess}
              />
            ) : (
              <EntitiesGrid
                columns={activeColumns}
                rowsMode={rowsMode}
                timeRange={timeRange}
                watchlistNames={watchlistNames}
                searchExpression={gridSearchExpression}
                entityExpression={gridEntityExpression}
                cellHandlers={cellHandlers}
                rowActions={rowActions}
                readAccess={readAccess}
                toolbarControls={tableControls}
                sortField={sortField}
                sortDirection={sortDirection}
                onSortChange={setSort}
                onFullScreenChange={setIsGridFullScreen}
              />
            )}
          </DataViewContext.Provider>
        </div>
      </SecuritySolutionPageWrapper>
      {/* Full screen hides the tour's anchors; the tour picks up at the same step on exit. */}
      {!isGridFullScreen && (
        <ProductTour
          steps={productTour.steps}
          currentStep={productTour.currentStep}
          onNext={productTour.nextStep}
          onEnd={productTour.endTour}
        />
      )}
      <SpyRoute pageName={SecurityPageName.entityAnalyticsHomePage} />
    </>
  );
};

interface LabeledOption<K extends string> {
  key: K;
  label: string;
  description?: string;
}

interface LabeledOptionSelectorProps<K extends string> {
  title: string;
  options: ReadonlyArray<LabeledOption<K>>;
  selectedKey: K;
  onChange: (key: K) => void;
  'data-test-subj'?: string;
}

const LabeledOptionSelector = <K extends string>({
  title,
  options,
  selectedKey,
  onChange,
  'data-test-subj': dataTestSubj,
}: LabeledOptionSelectorProps<K>) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const selected = options.find((o) => o.key === selectedKey);
  const buttonLabel = selected?.label ?? selectedKey;

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [
      {
        id: 0,
        width: 320,
        items: options.map((option) => ({
          'data-test-subj': `labeled-option-${option.key}`,
          icon: option.key === selectedKey ? 'check' : 'empty',
          name: (
            <div>
              <EuiText size="s">
                <strong>{option.label}</strong>
              </EuiText>
              {option.description ? (
                <EuiText size="xs" color="subdued">
                  {option.description}
                </EuiText>
              ) : null}
            </div>
          ),
          onClick: () => {
            onChange(option.key);
            setIsPopoverOpen(false);
          },
        })),
      },
    ],
    [onChange, options, selectedKey]
  );

  return (
    <EuiPopover
      data-test-subj={dataTestSubj ?? 'labeledOptionSelector'}
      aria-label={title}
      button={
        <EuiButtonEmpty
          data-test-subj="labeled-option-selector-button"
          flush="both"
          iconSide="right"
          iconSize="s"
          iconType="chevronSingleDown"
          onClick={() => setIsPopoverOpen((open) => !open)}
          title={buttonLabel}
          size="xs"
        >
          {`${title}: ${buttonLabel}`}
        </EuiButtonEmpty>
      }
      closePopover={closePopover}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
