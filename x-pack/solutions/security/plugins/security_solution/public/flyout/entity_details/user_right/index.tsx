/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { EuiCallOut } from '@elastic/eui';
import { useHasMisconfigurations } from '@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations';
import { TableId } from '@kbn/securitysolution-data-table';
import { FF_ENABLE_ENTITY_STORE_V2, useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { euid } from '@kbn/entity-store/common';
import { buildEuidCspPreviewOptions } from '../../../cloud_security_posture/utils/build_euid_csp_preview_options';
import { buildUserNamesFilter } from '../../../../common/search_strategy';
import type { ESQuery } from '../../../../common/typed_json';
import { useUiSetting, useKibana } from '../../../common/lib/kibana';
import { useNonClosedAlerts } from '../../../cloud_security_posture/hooks/use_non_closed_alerts';
import { useRefetchQueryById } from '../../../entity_analytics/api/hooks/use_refetch_query_by_id';
import type { Refetch } from '../../../common/types';
import { RISK_INPUTS_TAB_QUERY_ID } from '../../../entity_analytics/components/entity_details_flyout/tabs/risk_inputs/risk_inputs_tab';
import { useCalculateEntityRiskScore } from '../../../entity_analytics/api/hooks/use_calculate_entity_risk_score';
import { useRiskScore } from '../../../entity_analytics/api/hooks/use_risk_score';
import { ManagedUserDatasetKey } from '../../../../common/search_strategy/security_solution/users/managed_details';
import { useManagedUser } from '../shared/hooks/use_managed_user';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { UserPanelFooter } from './footer';
import { UserPanelContent } from './content';
import { UserPanelHeader } from './header';
import { EntityDetailsLeftPanelTab } from '../shared/components/left_panel/left_panel_header';
import { UserPreviewPanelFooter } from '../user_preview/footer';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from '../../../overview/components/detection_response/alerts_by_status/types';
import { useNavigateToUserDetails } from './hooks/use_navigate_to_user_details';
import { EntityType } from '../../../../common/entity_analytics/types';
import { useObservedUser } from './hooks/use_observed_user';
import { useEntityFromStore } from '../shared/hooks/use_entity_from_store';
import {
  buildRiskScoreStateFromEntityRecord,
  getRiskFromEntityRecord,
} from '../shared/entity_store_risk_utils';
import { useEntityAnalyticsRoutes } from '../../../entity_analytics/api/api';
import { ENABLE_ASSET_INVENTORY_SETTING } from '../../../../common/constants';
import type { IdentityFields } from '../../document_details/shared/utils';
import { NO_CORRESPONDING_ENTITY_EXISTS } from '../shared/translations';

export interface UserPanelProps extends Record<string, unknown> {
  contextID: string;
  scopeId: string;
  isPreviewMode: boolean;
  /**
   * Display name from the source row / document (typically `user.name`).
   */
  userName: string;
  /**
   * Canonical Entity Store v2 id (`entity.id`) when already resolved (e.g. from alerts/events table).
   */
  entityId?: string;
}

export interface UserPanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'user-panel' | 'user-preview-panel';
  params: UserPanelProps;
}

export const UserPreviewPanelKey: UserPanelExpandableFlyoutProps['key'] = 'user-preview-panel';
export const USER_PANEL_RISK_SCORE_QUERY_ID = 'userPanelRiskScoreQuery';
const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

export const UserPanel = ({
  contextID,
  scopeId,
  isPreviewMode = false,
  userName,
  entityId: entityIdProp,
}: UserPanelProps) => {
  const { uiSettings } = useKibana().services;
  const euidApi = useEntityStoreEuidApi();
  const assetInventoryEnabled = uiSettings.get(ENABLE_ASSET_INVENTORY_SETTING, true);
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);

  const safeContextID = contextID ?? scopeId ?? 'user-panel';

  const resolutionSeedIdentifiers = useMemo(() => {
    const next: IdentityFields = {};
    if (userName) {
      next['user.name'] = userName;
    }
    if (entityIdProp) {
      next['user.entity.id'] = entityIdProp;
    }
    return next;
  }, [userName, entityIdProp]);

  const { to, from, setQuery, deleteQuery, isInitializing } = useGlobalTime();
  const entityFromStoreResult = useEntityFromStore({
    entityId: entityIdProp,
    identityFields: Object.keys(resolutionSeedIdentifiers).length
      ? resolutionSeedIdentifiers
      : undefined,
    entityType: 'user',
    skip: !entityStoreV2Enabled || isInitializing,
  });

  const documentEntityIdentifiers = useMemo<IdentityFields>(() => {
    return euid.getEntityIdentifiersFromDocument('user', entityFromStoreResult.entityRecord) ?? {};
  }, [entityFromStoreResult.entityRecord]);

  const resolvedEntityId = entityFromStoreResult.entityRecord?.entity?.id ?? entityIdProp;

  const effectiveUserName = useMemo<string>(
    () =>
      userName ||
      documentEntityIdentifiers['user.name'] ||
      Object.values(documentEntityIdentifiers)[0] ||
      '',
    [userName, documentEntityIdentifiers]
  );

  const hasResolutionInput = Boolean(entityIdProp || userName);
  const hasDocumentIdentity = Object.keys(documentEntityIdentifiers).length > 0;

  const userFilterQuery = useMemo((): ESQuery | undefined => {
    if (entityStoreV2Enabled && euidApi?.euid && hasDocumentIdentity) {
      return euidApi.euid.getEuidDslFilterBasedOnDocument(
        'user',
        documentEntityIdentifiers
      ) as unknown as ESQuery | undefined;
    }
    return effectiveUserName ? (buildUserNamesFilter([effectiveUserName]) as ESQuery) : undefined;
  }, [
    entityStoreV2Enabled,
    euidApi?.euid,
    documentEntityIdentifiers,
    effectiveUserName,
    hasDocumentIdentity,
  ]);

  const observedUser = useObservedUser(documentEntityIdentifiers, scopeId);

  const riskScoreState = useRiskScore({
    riskEntity: EntityType.user,
    filterQuery: userFilterQuery,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
    skip: entityStoreV2Enabled && !!observedUser?.entityRecord,
  });

  const { inspect, refetch, loading } = riskScoreState;
  const managedUser = useManagedUser();

  const { data: userRisk } = riskScoreState;
  const userRiskData = userRisk && userRisk.length > 0 ? userRisk[0] : undefined;

  const refetchRiskInputsTab = useRefetchQueryById(RISK_INPUTS_TAB_QUERY_ID);
  const refetchRiskScore = useCallback(() => {
    refetch();
    (refetchRiskInputsTab as Refetch | null)?.();
  }, [refetch, refetchRiskInputsTab]);

  const { isLoading: recalculatingScore, calculateEntityRiskScore } = useCalculateEntityRiskScore(
    EntityType.user,
    effectiveUserName,
    { onSuccess: refetchRiskScore }
  );

  const { hasMisconfigurationFindings } = useHasMisconfigurations(
    buildEuidCspPreviewOptions('user', documentEntityIdentifiers, euidApi)
  );

  const { hasNonClosedAlerts } = useNonClosedAlerts({
    identityFields: documentEntityIdentifiers,
    to,
    from,
    queryId: `${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}USER_NAME_RIGHT`,
  });

  const useEntityStoreInspectForRisk = entityStoreV2Enabled && observedUser.entityRecord != null;

  useQueryInspector({
    deleteQuery,
    inspect: useEntityStoreInspectForRisk ? entityFromStoreResult?.inspect ?? null : inspect,
    loading: useEntityStoreInspectForRisk ? entityFromStoreResult?.isLoading ?? false : loading,
    queryId: USER_PANEL_RISK_SCORE_QUERY_ID,
    refetch: useEntityStoreInspectForRisk ? entityFromStoreResult?.refetch ?? (() => {}) : refetch,
    setQuery,
  });

  const isRiskScoreExist =
    entityStoreV2Enabled && observedUser.entityRecord
      ? !!getRiskFromEntityRecord(observedUser.entityRecord)
      : !!userRiskData?.user?.risk;

  const openDetailsPanel = useNavigateToUserDetails({
    documentEntityIdentifiers,
    userName: effectiveUserName,
    entityId: resolvedEntityId,
    scopeId,
    contextID: safeContextID,
    isRiskScoreExist,
    hasMisconfigurationFindings,
    hasNonClosedAlerts,
    isPreviewMode,
  });

  const { upsertEntity } = useEntityAnalyticsRoutes();

  const riskScoreStateFromStore =
    entityStoreV2Enabled && observedUser.entityRecord
      ? buildRiskScoreStateFromEntityRecord(EntityType.user, observedUser.entityRecord, {
          refetch: observedUser.refetchEntityStore ?? (() => {}),
          isLoading: observedUser.isLoading,
          error: null,
          inspect: entityFromStoreResult?.inspect,
        })
      : null;

  const effectiveRiskScoreState = riskScoreStateFromStore ?? riskScoreState;

  const handleSaveAssetCriticalityViaEntityStore = useCallback(
    async (updatedRecord: Parameters<typeof upsertEntity>[0]['body']) => {
      await upsertEntity({ entityType: 'user', body: updatedRecord, force: true });
      observedUser.refetchEntityStore?.();
      calculateEntityRiskScore();
    },
    [upsertEntity, observedUser, calculateEntityRiskScore]
  );

  const openPanelFirstTab = useCallback(
    () =>
      openDetailsPanel({
        tab: isRiskScoreExist
          ? EntityDetailsLeftPanelTab.RISK_INPUTS
          : EntityDetailsLeftPanelTab.CSP_INSIGHTS,
      }),
    [isRiskScoreExist, openDetailsPanel]
  );

  const noEntityInStore =
    entityStoreV2Enabled &&
    hasResolutionInput &&
    !entityFromStoreResult.isLoading &&
    !observedUser.entityRecord;

  const hasUserDetailsData =
    isRiskScoreExist ||
    !!managedUser.data?.[ManagedUserDatasetKey.OKTA] ||
    !!managedUser.data?.[ManagedUserDatasetKey.ENTRA];

  return (
    <>
      <FlyoutNavigation
        flyoutIsExpandable={hasUserDetailsData || hasMisconfigurationFindings || hasNonClosedAlerts}
        expandDetails={openPanelFirstTab}
        isPreviewMode={isPreviewMode}
        isRulePreview={scopeId === TableId.rulePreview}
      />
      <UserPanelHeader
        identityFields={documentEntityIdentifiers}
        lastSeen={observedUser.lastSeen}
        managedUser={managedUser}
        userName={effectiveUserName}
      />
      {noEntityInStore && (
        <EuiCallOut
          title={NO_CORRESPONDING_ENTITY_EXISTS}
          color="warning"
          iconType="warning"
          data-test-subj="entity-flyout-no-entity-warning"
          announceOnMount
        />
      )}
      <UserPanelContent
        observedUser={observedUser}
        riskScoreState={effectiveRiskScoreState}
        recalculatingScore={recalculatingScore}
        onAssetCriticalityChange={calculateEntityRiskScore}
        contextID={safeContextID}
        scopeId={scopeId}
        openDetailsPanel={openDetailsPanel}
        isPreviewMode={isPreviewMode}
        identityFields={documentEntityIdentifiers}
        entityRecord={entityStoreV2Enabled ? observedUser.entityRecord ?? undefined : undefined}
        criticalityFromEntityStore={
          entityStoreV2Enabled && observedUser.entityRecord?.asset?.criticality
            ? observedUser.entityRecord.asset.criticality
            : undefined
        }
        onSaveAssetCriticalityViaEntityStore={
          entityStoreV2Enabled && observedUser.entityRecord
            ? handleSaveAssetCriticalityViaEntityStore
            : undefined
        }
        skipRiskAndCriticality={noEntityInStore}
        useEntityStoreV2={entityStoreV2Enabled && observedUser.entityRecord != null}
      />
      {!isPreviewMode && assetInventoryEnabled && (
        <UserPanelFooter identityFields={documentEntityIdentifiers} />
      )}
      {isPreviewMode && (
        <UserPreviewPanelFooter
          userName={effectiveUserName}
          entityId={resolvedEntityId}
          contextID={safeContextID}
          scopeId={scopeId}
        />
      )}
    </>
  );
};

UserPanel.displayName = 'UserPanel';
