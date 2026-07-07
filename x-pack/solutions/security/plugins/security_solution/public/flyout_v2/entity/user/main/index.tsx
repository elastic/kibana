/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { noop } from 'lodash/fp';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import { EuiFlyoutHeader, EuiFlyoutBody, EuiSpacer, EuiFlyoutFooter } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { FF_ENABLE_ENTITY_STORE_V2, useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { useUpdateAssetCriticality } from '../../../../entity_analytics/api/hooks/use_update_asset_criticality';
import { useAssetCriticalityPrivileges } from '../../../../entity_analytics/components/asset_criticality/use_asset_criticality';
import { useRefetchQueryById } from '../../../../entity_analytics/api/hooks/use_refetch_query_by_id';
import type { Refetch } from '../../../../common/types';
import { useEntityRiskScoreRecalculation } from '../../../../entity_analytics/api/hooks/use_entity_risk_score_recalculation';
import { ENTITY_ANALYTICS_TABLE_ID } from '../../../../entity_analytics/components/home/constants';
import { useRiskScore } from '../../../../entity_analytics/api/hooks/use_risk_score';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { buildUserNamesFilter, type RiskSeverity } from '../../../../../common/search_strategy';
import { ManagedUserDatasetKey } from '../../../../../common/search_strategy/security_solution/users/managed_details';
import { useUiSetting, useKibana } from '../../../../common/lib/kibana';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import type { EntityDetailsPath } from '../../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import {
  CspInsightLeftPanelSubTab,
  EntityDetailsLeftPanelTab,
} from '../../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { flyoutProviders } from '../../../shared/components/flyout_provider';
import {
  defaultToolsFlyoutProperties,
  useDefaultDocumentFlyoutProperties,
} from '../../../shared/hooks/use_default_flyout_properties';
import { documentFlyoutHistoryKey } from '../../../shared/constants/flyout_history';
import { RiskInputs } from '../../shared/tools/risk_inputs';
import { MisconfigurationInsights } from '../../shared/tools/misconfiguration_insights';
import { AlertsInsights } from '../../shared/tools/alerts_insights';
import { OktaInsights } from '../tools/okta_insights';
import { EntraInsights } from '../tools/entra_insights';
import { Header } from './header';
import { Content } from './content';
import { Footer } from './footer';
import { useObservedUser } from './hooks/use_observed_user';
import { useManagedUser } from '../../../../flyout/entity_details/shared/hooks/use_managed_user';
import { EntityType } from '../../../../../common/entity_analytics/types';
import {
  buildRiskScoreStateFromEntityRecord,
  getRiskFromEntityRecord,
} from '../../../../flyout/entity_details/shared/entity_store_risk_utils';
import {
  useEntityFromStore,
  type EntityStoreRecord,
} from '../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import type { CriticalityLevelWithUnassigned } from '../../../../../common/entity_analytics/asset_criticality/types';
import { ENABLE_ASSET_INVENTORY_SETTING } from '../../../../../common/constants';
import {
  mergeLegacyIdentityWhenStoreEntityMissing,
  type IdentityFields,
} from '../../../../flyout/document_details/shared/utils';
import { USER_PANEL_RISK_SCORE_QUERY_ID } from './constants';
import {
  useEntityPanelTabs,
  TABLE_TAB_ID,
} from '../../../../flyout/entity_details/shared/hooks/use_entity_panel_tabs';
import { EntityPanelHeaderTabs } from '../../../../flyout/entity_details/shared/components/entity_panel_tabs';
import { EntityStoreTableTab } from '../../../../flyout/entity_details/shared/components/entity_store_table_tab';
import { EntitySummaryGrid } from '../../../../flyout/entity_details/shared/components/entity_summary_grid';

export interface UserProps {
  /**
   * Display name from the source row / document (typically `user.name`).
   */
  userName: string;
  /**
   * The source document record. When provided, entityId is computed from the document's
   * user identity fields using the EUID API. Falls back to the `entityId` prop if the
   * EUID API returns no value.
   */
  hit?: DataTableRecord;
  /**
   * Canonical Entity Store v2 id (`entity.id`) when already resolved.
   * Used directly when `hit` is not provided, or as a fallback when EUID resolution yields no value.
   */
  entityId?: string;
  /**
   * Scope id (timeline id, table id, etc.) — used for downstream containers and queries.
   */
  scopeId?: string;
  /**
   * Stable identifier for the user panel context (defaults to `scopeId` or a static fallback).
   */
  contextID?: string;
}

const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

/**
 * Runs the same data hooks as the v1 `UserPanel`, but without the expandable-flyout
 * navigation or preview-mode handling. Detail panels (risk inputs, Okta, Entra, etc.)
 * open as separate system flyouts via `overlays.openSystemFlyout`.
 */
export const User: FC<UserProps> = memo(function User({
  userName,
  hit,
  entityId: entityIdProp,
  scopeId = '',
  contextID,
}) {
  const { services } = useKibana();
  const { uiSettings, overlays } = services;
  const store = useStore();
  const history = useHistory();
  const euidApi = useEntityStoreEuidApi();

  const entityId = useMemo(
    () => (hit ? euidApi?.euid?.getEuidFromObject('user', hit.flattened) : entityIdProp),
    [hit, euidApi, entityIdProp]
  );
  const assetInventoryEnabled = uiSettings.get(ENABLE_ASSET_INVENTORY_SETTING, true);
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2);
  const isInSecurityApp = useIsInSecurityApp();
  const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();

  const safeContextID = contextID ?? scopeId ?? 'user-panel';
  const { setQuery, deleteQuery, isInitializing } = useGlobalTime();

  const userStoreIdentityFields = useMemo(
    () => (!entityId && userName ? { 'user.name': userName } : undefined),
    [entityId, userName]
  );

  const entityFromStoreResult = useEntityFromStore({
    entityId,
    identityFields: userStoreIdentityFields,
    entityType: 'user',
    skip: !entityStoreV2Enabled || isInitializing,
  });

  const documentEntityIdentifiers = useMemo<IdentityFields>(() => {
    const legacyFields =
      userName != null && userName !== '' ? { 'user.name': userName } : ({} as IdentityFields);
    if (entityStoreV2Enabled) {
      const fromStore =
        euidApi?.euid?.getEntityIdentifiersFromDocument(
          'user',
          entityFromStoreResult.entityRecord
        ) ?? {};
      return mergeLegacyIdentityWhenStoreEntityMissing(fromStore, legacyFields);
    }
    return legacyFields;
  }, [entityStoreV2Enabled, euidApi?.euid, entityFromStoreResult.entityRecord, userName]);

  const userNameFilterQuery = useMemo(
    () => (userName ? buildUserNamesFilter([userName]) : undefined),
    [userName]
  );

  const riskScoreState = useRiskScore({
    riskEntity: EntityType.user,
    filterQuery: userNameFilterQuery,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
    skip: entityStoreV2Enabled,
  });

  const { inspect: inspectRiskScore, refetch, loading } = riskScoreState;

  const managedUser = useManagedUser();

  const observedUser = useObservedUser(
    userName,
    scopeId,
    entityStoreV2Enabled ? entityFromStoreResult : undefined
  );

  const refetchEntitiesTable = useRefetchQueryById(ENTITY_ANALYTICS_TABLE_ID);
  const onRecalculation = useCallback(() => {
    (refetchEntitiesTable as Refetch | null)?.();
  }, [refetchEntitiesTable]);

  const { entityRiskScores, recalculatingScore, calculateEntityRiskScore } =
    useEntityRiskScoreRecalculation({
      entityType: EntityType.user,
      identifier: userName,
      entityId: entityStoreV2Enabled ? observedUser.entityRecord?.entity?.id : undefined,
      entityStoreV2Enabled,
      entityFromStoreResult,
      riskScoreState,
      onRecalculation,
    });

  const onAssetCriticalityChanged = useCallback(() => {
    (refetchEntitiesTable as Refetch | null)?.();
    calculateEntityRiskScore();
  }, [calculateEntityRiskScore, refetchEntitiesTable]);

  const { updateAssetCriticalityLevel } = useUpdateAssetCriticality('user', {
    onSuccess: onAssetCriticalityChanged,
  });

  const assetCriticalityPrivileges = useAssetCriticalityPrivileges(entityIdProp ?? userName);

  const panelDisplayEntityId = useMemo(
    () => (entityStoreV2Enabled ? observedUser.entityRecord?.entity?.id : entityId),
    [entityId, entityStoreV2Enabled, observedUser.entityRecord?.entity?.id]
  );

  const useEntityStoreInspectForRisk = entityStoreV2Enabled && observedUser.entityRecord != null;

  useQueryInspector({
    deleteQuery,
    inspect: useEntityStoreInspectForRisk
      ? entityFromStoreResult?.inspect ?? null
      : inspectRiskScore,
    loading: useEntityStoreInspectForRisk ? entityFromStoreResult?.isLoading ?? false : loading,
    queryId: USER_PANEL_RISK_SCORE_QUERY_ID,
    refetch: useEntityStoreInspectForRisk ? entityFromStoreResult?.refetch ?? noop : refetch,
    setQuery,
  });

  const entityFromStore: EntityStoreRecord | undefined = entityStoreV2Enabled
    ? observedUser.entityRecord ?? undefined
    : undefined;
  const riskScoreStateFromStore =
    entityStoreV2Enabled && observedUser.entityRecord
      ? buildRiskScoreStateFromEntityRecord(EntityType.user, observedUser.entityRecord, {
          refetch: observedUser.refetchEntityStore ?? noop,
          isLoading: observedUser.isLoading,
          error: null,
          inspect: entityFromStoreResult?.inspect,
        })
      : null;

  const effectiveRiskScoreState = riskScoreStateFromStore ?? riskScoreState;

  const onCriticalitySave =
    !!assetCriticalityPrivileges.data?.has_write_permissions &&
    entityFromStoreResult.entityRecord &&
    observedUser.entityRecord
      ? (level: CriticalityLevelWithUnassigned) =>
          updateAssetCriticalityLevel(level, observedUser.entityRecord)
      : undefined;

  const entityStoreEntityId = entityStoreV2Enabled
    ? observedUser.entityRecord?.entity?.id
    : undefined;

  const noEntityInStore =
    entityStoreV2Enabled && !entityFromStoreResult.isLoading && !observedUser.entityRecord;

  const { tabs, selectedTabId, setSelectedTabId } = useEntityPanelTabs({
    entityRecord: observedUser.entityRecord ?? null,
  });

  const tabsNode = tabs ? (
    <EntityPanelHeaderTabs
      tabs={tabs}
      selectedTabId={selectedTabId}
      setSelectedTabId={setSelectedTabId}
    />
  ) : undefined;

  const onOpenUser = useCallback(() => {
    overlays.openSystemFlyout(
      flyoutProviders({
        services,
        store,
        history,
        children: <User userName={userName} entityId={entityId} scopeId={scopeId} />,
      }),
      { ...defaultDocumentFlyoutProperties, title: userName, historyKey, session: 'inherit' }
    );
  }, [
    overlays,
    services,
    store,
    history,
    historyKey,
    userName,
    entityId,
    scopeId,
    defaultDocumentFlyoutProperties,
  ]);

  const openDetailsPanel = useCallback(
    (path: EntityDetailsPath) => {
      const common = {
        ...defaultToolsFlyoutProperties,
        title: userName,
        historyKey,
        session: 'start' as const,
      };
      const wrap = (children: React.ReactNode) =>
        overlays.openSystemFlyout(flyoutProviders({ services, store, history, children }), common);

      switch (path.tab) {
        case EntityDetailsLeftPanelTab.RISK_INPUTS:
          return wrap(
            <RiskInputs
              entityType={EntityType.user}
              entityName={userName}
              entityId={entityStoreEntityId}
              onShowEntity={onOpenUser}
            />
          );
        case EntityDetailsLeftPanelTab.CSP_INSIGHTS:
          switch (path.subTab) {
            case CspInsightLeftPanelSubTab.ALERTS:
              return wrap(
                <AlertsInsights
                  entityType={EntityType.user}
                  value={userName}
                  entityId={panelDisplayEntityId}
                  onShowEntity={onOpenUser}
                />
              );
            case CspInsightLeftPanelSubTab.MISCONFIGURATIONS:
              return wrap(
                <MisconfigurationInsights
                  entityType={EntityType.user}
                  value={userName}
                  entityId={panelDisplayEntityId}
                  onShowEntity={onOpenUser}
                />
              );
          }
          break;
        // TODO: currently dead (v1 accessed through left pane tabs, need to perhaps add preview?)
        case EntityDetailsLeftPanelTab.OKTA: {
          const oktaManagedUser = managedUser.data?.[ManagedUserDatasetKey.OKTA];
          if (oktaManagedUser) {
            return wrap(
              <OktaInsights
                managedUser={oktaManagedUser}
                value={userName}
                onOpenUser={onOpenUser}
              />
            );
          }
          break;
        }
        case EntityDetailsLeftPanelTab.ENTRA: {
          const entraManagedUser = managedUser.data?.[ManagedUserDatasetKey.ENTRA];
          if (entraManagedUser) {
            return wrap(
              <EntraInsights
                managedUser={entraManagedUser}
                value={userName}
                onOpenUser={onOpenUser}
              />
            );
          }
          break;
        }
      }
    },
    [
      overlays,
      services,
      store,
      history,
      historyKey,
      userName,
      panelDisplayEntityId,
      entityStoreEntityId,
      managedUser,
      onOpenUser,
    ]
  );

  const riskLevel = observedUser.entityRecord
    ? ((getRiskFromEntityRecord(observedUser.entityRecord)?.calculated_level ??
        'Unknown') as RiskSeverity)
    : undefined;

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <Header
          userName={userName}
          managedUser={managedUser}
          lastSeen={observedUser.lastSeen}
          entityId={panelDisplayEntityId}
          identityFields={documentEntityIdentifiers}
          isEntityInStore={!!observedUser.entityRecord}
          riskLevel={riskLevel}
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {observedUser.entityRecord && (
          <EntitySummaryGrid
            entityRecord={observedUser.entityRecord}
            criticalityLevel={entityFromStoreResult.entityRecord?.asset?.criticality}
            onCriticalitySave={onCriticalitySave}
          />
        )}
        {tabsNode}
        {tabs && <EuiSpacer size="l" />}
        {tabs && selectedTabId === TABLE_TAB_ID && observedUser.entityRecord ? (
          <EntityStoreTableTab entityRecord={observedUser.entityRecord} />
        ) : (
          <Content
            identityFields={documentEntityIdentifiers}
            observedUser={observedUser}
            riskScoreState={effectiveRiskScoreState}
            entityRiskScores={entityRiskScores}
            contextID={safeContextID}
            scopeId={scopeId}
            openDetailsPanel={openDetailsPanel}
            recalculatingScore={recalculatingScore}
            onAssetCriticalityChange={onAssetCriticalityChanged}
            isPreviewMode={false}
            entityRecord={entityStoreV2Enabled ? observedUser.entityRecord ?? undefined : undefined}
            skipRiskAndCriticality={noEntityInStore}
            entityStoreEntityId={entityStoreEntityId}
            enableGraphAndResolutionNavigation={false}
            hideHeaderIcons
          />
        )}
      </EuiFlyoutBody>
      {assetInventoryEnabled && (
        <EuiFlyoutFooter>
          <Footer identityFields={documentEntityIdentifiers} entity={entityFromStore} />
        </EuiFlyoutFooter>
      )}
    </>
  );
});

User.displayName = 'User';
