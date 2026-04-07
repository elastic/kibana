/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useQueryClient } from '@kbn/react-query';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { EuiCallOut } from '@elastic/eui';
import { useHasMisconfigurations } from '@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations';
import { TableId } from '@kbn/securitysolution-data-table';
import {
  bulkUpdateEntities,
  FF_ENABLE_ENTITY_STORE_V2,
  useEntityStoreEuidApi,
} from '@kbn/entity-store/public';
import { buildEuidCspPreviewOptions } from '../../../cloud_security_posture/utils/build_euid_csp_preview_options';
import { buildUserNamesFilter } from '../../../../common/search_strategy';
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
import type { Entity } from '../../../../common/api/entity_analytics';
import {
  applyEntityStoreSearchCachePatch,
  useEntityFromStore,
  type EntityStoreRecord,
} from '../shared/hooks/use_entity_from_store';
import {
  buildRiskScoreStateFromEntityRecord,
  getRiskFromEntityRecord,
} from '../shared/entity_store_risk_utils';
import { ENABLE_ASSET_INVENTORY_SETTING } from '../../../../common/constants';
import {
  mergeLegacyIdentityWhenStoreEntityMissing,
  type IdentityFields,
} from '../../document_details/shared/utils';
import { NO_CORRESPONDING_ENTITY_EXISTS } from '../shared/translations';
import { USER_PANEL_RISK_SCORE_QUERY_ID, USER_PANEL_OBSERVED_USER_QUERY_ID } from './constants';

export { USER_PANEL_RISK_SCORE_QUERY_ID, USER_PANEL_OBSERVED_USER_QUERY_ID };

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
  const { http, uiSettings } = useKibana().services;
  const queryClient = useQueryClient();
  const euidApi = useEntityStoreEuidApi();
  const assetInventoryEnabled = uiSettings.get(ENABLE_ASSET_INVENTORY_SETTING, true);
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);

  const safeContextID = contextID ?? scopeId ?? 'user-panel';

  const { to, from, setQuery, deleteQuery, isInitializing } = useGlobalTime();

  const userStoreIdentityFields = useMemo(
    () => (!entityIdProp && userName ? { 'user.name': userName } : undefined),
    [entityIdProp, userName]
  );

  const entityFromStoreResult = useEntityFromStore({
    entityId: entityIdProp,
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
  const observedUser = useObservedUser(
    userName,
    scopeId,
    entityStoreV2Enabled ? entityFromStoreResult : undefined
  );

  const panelDisplayEntityId = useMemo(
    () => (entityStoreV2Enabled ? observedUser.entityRecord?.entity?.id : entityIdProp),
    [entityIdProp, entityStoreV2Enabled, observedUser.entityRecord?.entity?.id]
  );

  const riskScoreState = useRiskScore({
    riskEntity: EntityType.user,
    filterQuery: userNameFilterQuery,
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
    userName,
    { onSuccess: refetchRiskScore }
  );

  const { hasMisconfigurationFindings } = useHasMisconfigurations(
    buildEuidCspPreviewOptions('user', entityFromStoreResult.entityRecord, euidApi, {
      entityStoreV2Enabled,
      legacyIdentityFields:
        userName != null && userName !== '' ? { 'user.name': userName } : undefined,
    })
  );

  const { hasNonClosedAlerts } = useNonClosedAlerts({
    identityFields: documentEntityIdentifiers,
    entityType: EntityType.user,
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

  const entityStoreEntityId = entityStoreV2Enabled
    ? observedUser.entityRecord?.entity?.id
    : undefined;

  const openDetailsPanel = useNavigateToUserDetails({
    userName,
    entityId: panelDisplayEntityId,
    scopeId,
    identityFields: documentEntityIdentifiers ?? {},
    contextID: safeContextID,
    isRiskScoreExist,
    hasMisconfigurationFindings,
    hasNonClosedAlerts,
    isPreviewMode,
    entityStoreEntityId,
  });

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
    async (updatedRecord: Entity) => {
      await bulkUpdateEntities(http, {
        entityType: 'user',
        body: updatedRecord as Record<string, unknown>,
        force: true,
      });
      applyEntityStoreSearchCachePatch(queryClient, 'user', updatedRecord as EntityStoreRecord);
      calculateEntityRiskScore();
    },
    [http, queryClient, calculateEntityRiskScore]
  );

  const defaultTab = useMemo(() => {
    if (isRiskScoreExist) return EntityDetailsLeftPanelTab.RISK_INPUTS;
    if (hasMisconfigurationFindings || hasNonClosedAlerts)
      return EntityDetailsLeftPanelTab.CSP_INSIGHTS;
    if (entityStoreEntityId) return EntityDetailsLeftPanelTab.RESOLUTION_GROUP;
    return EntityDetailsLeftPanelTab.RISK_INPUTS;
  }, [isRiskScoreExist, hasMisconfigurationFindings, hasNonClosedAlerts, entityStoreEntityId]);

  const openDefaultPanel = useCallback(
    () => openDetailsPanel({ tab: defaultTab }),
    [openDetailsPanel, defaultTab]
  );

  const entityFromStore: EntityStoreRecord | undefined = entityStoreV2Enabled
    ? observedUser.entityRecord ?? undefined
    : undefined;

  const entityStoreLookupRequested =
    Boolean(entityIdProp) ||
    Boolean(userStoreIdentityFields && Object.keys(userStoreIdentityFields).length > 0);

  const noEntityInStore =
    entityStoreV2Enabled &&
    entityStoreLookupRequested &&
    !entityFromStoreResult.isLoading &&
    !entityFromStoreResult.entityRecord;

  const hasUserDetailsData =
    isRiskScoreExist ||
    !!managedUser.data?.[ManagedUserDatasetKey.OKTA] ||
    !!managedUser.data?.[ManagedUserDatasetKey.ENTRA];

  return (
    <>
      <FlyoutNavigation
        flyoutIsExpandable={
          hasUserDetailsData ||
          hasMisconfigurationFindings ||
          hasNonClosedAlerts ||
          !!entityStoreEntityId
        }
        expandDetails={openDefaultPanel}
        isPreviewMode={isPreviewMode}
        isRulePreview={scopeId === TableId.rulePreview}
      />
      <UserPanelHeader
        lastSeen={observedUser.lastSeen}
        managedUser={managedUser}
        userName={userName}
        entityId={panelDisplayEntityId}
        identityFields={documentEntityIdentifiers}
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
          entityStoreV2Enabled && entityFromStoreResult.entityRecord
            ? entityFromStoreResult.entityRecord?.asset?.criticality
            : undefined
        }
        onSaveAssetCriticalityViaEntityStore={
          entityStoreV2Enabled && entityFromStoreResult.entityRecord
            ? handleSaveAssetCriticalityViaEntityStore
            : undefined
        }
        skipRiskAndCriticality={noEntityInStore}
        entityStoreEntityId={entityStoreEntityId}
      />
      {!isPreviewMode && assetInventoryEnabled && (
        <UserPanelFooter identityFields={documentEntityIdentifiers} entity={entityFromStore} />
      )}
      {isPreviewMode && (
        <UserPreviewPanelFooter
          userName={userName}
          entityId={panelDisplayEntityId}
          contextID={safeContextID}
          scopeId={scopeId}
          entity={entityFromStore}
        />
      )}
    </>
  );
};

UserPanel.displayName = 'UserPanel';
