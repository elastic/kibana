/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useHasMisconfigurations } from '@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations';
import { TableId } from '@kbn/securitysolution-data-table';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { EuiSpacer } from '@elastic/eui';
import { useUpdateAssetCriticality } from '../../../entity_analytics/api/hooks/use_update_asset_criticality';
import { buildEuidCspPreviewOptions } from '../../../cloud_security_posture/utils/build_euid_csp_preview_options';
import type { RiskSeverity } from '../../../../common/search_strategy';
import { useKibana } from '../../../common/lib/kibana';
import { useNonClosedAlerts } from '../../../cloud_security_posture/hooks/use_non_closed_alerts';
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
import { useEntityFromStore, type EntityStoreRecord } from '../shared/hooks/use_entity_from_store';
import type { CriticalityLevelWithUnassigned } from '../../../../common/entity_analytics/asset_criticality/types';
import {
  buildEmptyRiskScoreState,
  buildRiskScoreStateFromEntityRecord,
  getRiskFromEntityRecord,
} from '../shared/entity_store_risk_utils';
import { ENABLE_ASSET_INVENTORY_SETTING } from '../../../../common/constants';
import {
  mergeLegacyIdentityWhenStoreEntityMissing,
  type IdentityFields,
} from '../../document_details/shared/utils';
import { USER_PANEL_RISK_SCORE_QUERY_ID, USER_PANEL_OBSERVED_USER_QUERY_ID } from './constants';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { useEntityPanelTabs, TABLE_TAB_ID } from '../shared/hooks/use_entity_panel_tabs';
import { EntityPanelHeaderTabs } from '../shared/components/entity_panel_tabs';
import { EntityStoreTableTab } from '../shared/components/entity_store_table_tab';
import { EntitySummaryGrid } from '../shared/components/entity_summary_grid';

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

export const UserPanel = memo(function UserPanel({
  contextID,
  scopeId,
  isPreviewMode = false,
  userName,
  entityId: entityIdProp,
}: UserPanelProps) {
  const { uiSettings } = useKibana().services;
  const euidApi = useEntityStoreEuidApi();
  const assetInventoryEnabled = uiSettings.get(ENABLE_ASSET_INVENTORY_SETTING, true);

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
    skip: isInitializing,
  });

  const documentEntityIdentifiers = useMemo<IdentityFields>(() => {
    const legacyFields =
      userName != null && userName !== '' ? { 'user.name': userName } : ({} as IdentityFields);
    const fromStore =
      euidApi?.euid?.getEntityIdentifiersFromDocument('user', entityFromStoreResult.entityRecord) ??
      {};
    return mergeLegacyIdentityWhenStoreEntityMissing(fromStore, legacyFields);
  }, [euidApi?.euid, entityFromStoreResult.entityRecord, userName]);

  const observedUser = useObservedUser(userName, scopeId, entityFromStoreResult);

  const panelDisplayEntityId = observedUser.entityRecord?.entity?.id;

  const managedUser = useManagedUser();

  const { updateAssetCriticalityLevel } = useUpdateAssetCriticality('user', {
    onSuccess: () => {
      observedUser.refetchEntityStore?.();
    },
  });

  const { hasMisconfigurationFindings } = useHasMisconfigurations(
    buildEuidCspPreviewOptions('user', entityFromStoreResult.entityRecord, euidApi, {
      entityStoreV2Enabled: true,
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

  useQueryInspector({
    deleteQuery,
    inspect: entityFromStoreResult?.inspect ?? null,
    loading: entityFromStoreResult?.isLoading ?? false,
    queryId: USER_PANEL_RISK_SCORE_QUERY_ID,
    refetch: entityFromStoreResult?.refetch ?? (() => {}),
    setQuery,
  });

  const isRiskScoreExist = observedUser.entityRecord
    ? !!getRiskFromEntityRecord(observedUser.entityRecord)
    : false;

  const entityStoreEntityId = observedUser.entityRecord?.entity?.id;

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
    observedUser.entityRecord
      ? buildRiskScoreStateFromEntityRecord(EntityType.user, observedUser.entityRecord, {
          refetch: observedUser.refetchEntityStore ?? (() => {}),
          isLoading: observedUser.isLoading,
          error: null,
          inspect: entityFromStoreResult?.inspect,
        })
      : null;

  const effectiveRiskScoreState =
    riskScoreStateFromStore ??
    buildEmptyRiskScoreState<EntityType.user>({
      refetch: observedUser.refetchEntityStore ?? (() => {}),
      isLoading: observedUser.isLoading,
      error: null,
      inspect: entityFromStoreResult?.inspect,
    });

  const onCriticalitySave = entityFromStoreResult.entityRecord
    ? (level: CriticalityLevelWithUnassigned) =>
        updateAssetCriticalityLevel(level, entityFromStoreResult.entityRecord)
    : undefined;

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

  const entityFromStore: EntityStoreRecord | undefined = observedUser.entityRecord ?? undefined;

  const entityStoreLookupRequested =
    Boolean(entityIdProp) ||
    Boolean(userStoreIdentityFields && Object.keys(userStoreIdentityFields).length > 0);

  const noEntityInStore =
    entityStoreLookupRequested && !entityFromStoreResult.isLoading && !entityFromStoreResult.entityRecord;

  const hasUserDetailsData =
    isRiskScoreExist ||
    !!managedUser.data?.[ManagedUserDatasetKey.OKTA] ||
    !!managedUser.data?.[ManagedUserDatasetKey.ENTRA];

  const { tabs, selectedTabId, setSelectedTabId } = useEntityPanelTabs({
    entityRecord: entityFromStoreResult.entityRecord ?? null,
  });

  const tabsNode = tabs ? (
    <EntityPanelHeaderTabs
      tabs={tabs}
      selectedTabId={selectedTabId}
      setSelectedTabId={setSelectedTabId}
    />
  ) : undefined;

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
        isEntityInStore={!!entityFromStoreResult.entityRecord}
        riskLevel={
          entityFromStoreResult.entityRecord
            ? ((getRiskFromEntityRecord(entityFromStoreResult.entityRecord)?.calculated_level ??
                'Unknown') as RiskSeverity)
            : undefined
        }
      />
      <FlyoutBody>
        {entityFromStoreResult.entityRecord && (
          <EntitySummaryGrid
            entityRecord={entityFromStoreResult.entityRecord}
            criticalityLevel={entityFromStoreResult.entityRecord?.asset?.criticality}
            onCriticalitySave={onCriticalitySave}
          />
        )}
        {tabsNode}
        {tabs && <EuiSpacer size="l" />}
        {tabs && selectedTabId === TABLE_TAB_ID && entityFromStoreResult.entityRecord ? (
          <EntityStoreTableTab entityRecord={entityFromStoreResult.entityRecord} />
        ) : (
          <UserPanelContent
            observedUser={observedUser}
            riskScoreState={effectiveRiskScoreState}
            recalculatingScore={false}
            onAssetCriticalityChange={() => {
              observedUser.refetchEntityStore?.();
            }}
            contextID={safeContextID}
            scopeId={scopeId}
            openDetailsPanel={openDetailsPanel}
            isPreviewMode={isPreviewMode}
            identityFields={documentEntityIdentifiers}
            entityRecord={observedUser.entityRecord ?? undefined}
            skipRiskAndCriticality={noEntityInStore}
            entityStoreEntityId={entityStoreEntityId}
          />
        )}
      </FlyoutBody>
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
});

UserPanel.displayName = 'UserPanel';
