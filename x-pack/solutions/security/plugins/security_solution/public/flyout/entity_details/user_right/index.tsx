/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useHasMisconfigurations } from '@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations';
import { TableId } from '@kbn/securitysolution-data-table';
import type { ESQuery } from '../../../../common/typed_json';
import {
  buildUserFilterFromEntityIdentifiers,
  buildUserNamesFilter,
} from '../../../../common/search_strategy';
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
import { useKibana } from '../../../common/lib/kibana';
import { ENABLE_ASSET_INVENTORY_SETTING } from '../../../../common/constants';
import type { EntityIdentifiers } from '../../document_details/shared/utils';

export interface UserPanelProps extends Record<string, unknown> {
  contextID?: string;
  scopeId: string;
  isPreviewMode?: boolean;
  /**
   * Entity identifiers for the user (following entity store EUID logic)
   */
  entityIdentifiers?: EntityIdentifiers;
  /** @deprecated Use entityIdentifiers with 'user.name' key instead */
  userName?: string;
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
  entityIdentifiers,
  userName: legacyUserName,
}: UserPanelProps) => {
  const { uiSettings } = useKibana().services;
  const assetInventoryEnabled = uiSettings.get(ENABLE_ASSET_INVENTORY_SETTING, true);

  // Guard: entityIdentifiers and contextID with fallbacks to prevent "Unable to load page" errors
  // Support legacy userName param: when only userName is passed, derive entityIdentifiers
  const safeEntityIdentifiers = useMemo(
    () =>
      entityIdentifiers && Object.keys(entityIdentifiers).length > 0
        ? entityIdentifiers
        : legacyUserName
        ? { 'user.name': legacyUserName }
        : {},
    [entityIdentifiers, legacyUserName]
  );
  const safeContextID = contextID ?? scopeId ?? 'user-panel';
  const hasValidIdentifiers =
    safeEntityIdentifiers && Object.keys(safeEntityIdentifiers).length > 0;

  // Extract userName from entityIdentifiers
  // Priority: entityIdentifiers['user.name'] > entityIdentifiers[first key]
  const effectiveUserName = useMemo<string>(() => {
    if (!hasValidIdentifiers) return '';
    const userNameFromIdentifiers =
      safeEntityIdentifiers['user.name'] || Object.values(safeEntityIdentifiers)[0];
    return (userNameFromIdentifiers as string) ?? '';
  }, [safeEntityIdentifiers, hasValidIdentifiers]);

  const entityFilters = useMemo(
    () =>
      buildUserFilterFromEntityIdentifiers(safeEntityIdentifiers) ??
      (effectiveUserName ? buildUserNamesFilter([effectiveUserName]) : undefined),
    [safeEntityIdentifiers, effectiveUserName]
  );

  const riskScoreState = useRiskScore({
    riskEntity: EntityType.user,
    filterQuery: entityFilters as ESQuery,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
  });

  const { inspect, refetch, loading } = riskScoreState;
  const { to, from, setQuery, deleteQuery } = useGlobalTime();

  const observedUser = useObservedUser(safeEntityIdentifiers, scopeId);
  const managedUser = useManagedUser();

  const { data: userRisk } = riskScoreState;
  const userRiskData = userRisk && userRisk.length > 0 ? userRisk[0] : undefined;
  const isRiskScoreExist = !!userRiskData?.user.risk;

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

  const { hasMisconfigurationFindings } = useHasMisconfigurations(safeEntityIdentifiers);

  const { hasNonClosedAlerts } = useNonClosedAlerts({
    entityIdentifiers: safeEntityIdentifiers,
    to,
    from,
    queryId: `${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}USER_NAME_RIGHT`,
  });

  useQueryInspector({
    deleteQuery,
    inspect,
    loading,
    queryId: USER_PANEL_RISK_SCORE_QUERY_ID,
    refetch,
    setQuery,
  });

  const openDetailsPanel = useNavigateToUserDetails({
    entityIdentifiers: safeEntityIdentifiers,
    scopeId,
    contextID: safeContextID,
    isRiskScoreExist,
    hasMisconfigurationFindings,
    hasNonClosedAlerts,
    isPreviewMode,
  });

  const openPanelFirstTab = useCallback(
    () =>
      openDetailsPanel({
        tab: isRiskScoreExist
          ? EntityDetailsLeftPanelTab.RISK_INPUTS
          : EntityDetailsLeftPanelTab.CSP_INSIGHTS,
      }),
    [isRiskScoreExist, openDetailsPanel]
  );

  const hasUserDetailsData =
    !!userRiskData?.user.risk ||
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
        entityIdentifiers={safeEntityIdentifiers}
        lastSeen={observedUser.lastSeen}
        managedUser={managedUser}
        userName={effectiveUserName}
      />
      <UserPanelContent
        observedUser={observedUser}
        riskScoreState={riskScoreState}
        recalculatingScore={recalculatingScore}
        onAssetCriticalityChange={calculateEntityRiskScore}
        contextID={safeContextID}
        scopeId={scopeId}
        openDetailsPanel={openDetailsPanel}
        isPreviewMode={isPreviewMode}
        entityIdentifiers={safeEntityIdentifiers}
      />
      {!isPreviewMode && assetInventoryEnabled && (
        <UserPanelFooter entityIdentifiers={safeEntityIdentifiers} />
      )}
      {isPreviewMode && (
        <UserPreviewPanelFooter
          entityIdentifiers={safeEntityIdentifiers}
          contextID={safeContextID}
          scopeId={scopeId}
        />
      )}
    </>
  );
};

UserPanel.displayName = 'UserPanel';
