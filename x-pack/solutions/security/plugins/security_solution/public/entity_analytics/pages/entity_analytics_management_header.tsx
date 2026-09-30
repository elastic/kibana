/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AppHeaderMenu, AppHeaderTab } from '@kbn/app-header';

import { EntityAnalyticsErrorPanel } from '../components/entity_analytics_error_panel';
import { useToggleEntityAnalytics } from '../hooks/use_toggle_entity_analytics';
import { ENTITY_ANALYTICS } from '../../app/translations';
import { SecurityAppHeader } from '../../common/components/app_header';
import { useKibana } from '../../common/lib/kibana';
import { useMissingRiskEnginePrivileges } from '../hooks/use_missing_risk_engine_privileges';
import { ClearEntityDataModal } from '../components/entity_store/components/clear_entity_data_modal';
import {
  useDeleteEntityStoreMutation,
  useEntityStoreStatus,
} from '../components/entity_store/hooks/use_entity_store';
import { useEntityEnginePrivileges } from '../components/entity_store/hooks/use_entity_engine_privileges';
import { safeErrorMessage, userHasEntityStoreStopPrivileges } from '../common';
import {
  ASSET_CRITICALITY_TAB_TEST_ID,
  CLEAR_ENTITY_DATA_BUTTON_TEST_ID,
  ENGINE_STATUS_TAB_TEST_ID,
  ENTITY_ANALYTICS_SWITCH_TEST_ID,
  RISK_SCORE_TAB_TEST_ID,
  WATCHLISTS_TAB_TEST_ID,
} from '../test_ids';

export enum TabId {
  RiskScore = 'risk_score',
  AssetCriticality = 'asset_criticality',
  Watchlists = 'watchlists',
  EntityResolution = 'entity_resolution',
  Status = 'status',
}

const RISK_SCORE_TAB_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.riskScore.tabTitle',
  { defaultMessage: 'Entity risk score' }
);
const ASSET_CRITICALITY_TAB_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.assetCriticality.tabTitle',
  { defaultMessage: 'Asset criticality' }
);
const WATCHLISTS_TAB_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.watchlists.tabTitle',
  { defaultMessage: 'Watchlists' }
);
const ENTITY_RESOLUTION_TAB_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.entityResolution.tabTitle',
  { defaultMessage: 'Entity resolution' }
);
const ENGINE_STATUS_TAB_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.engineStatus.tabTitle',
  { defaultMessage: 'Engine status' }
);
const CLEAR_ENTITY_DATA_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.clearMenuItemLabel',
  { defaultMessage: 'Clear entity data' }
);
const ENABLED_SWITCH_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.enabledToggleSwitch',
  { defaultMessage: 'Enabled' }
);
const DISABLED_SWITCH_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.disabledToggleSwitch',
  { defaultMessage: 'Disabled' }
);

const canDeleteEntityEngine = (status?: string) =>
  !['not_installed', 'installing'].includes(status || '');

export interface EntityAnalyticsManagementHeaderProps {
  selectedTabId: TabId;
  onTabChange: (tabId: TabId) => void;
  isWatchlistsEnabled: boolean;
  hasEntityResolutionLicense: boolean;
  shouldDisplayEngineStatusTab: boolean;
  selectedSettingsMatchSavedSettings: boolean;
  onSaveSettings: () => Promise<void>;
  isSavingSettings: boolean;
}

export const EntityAnalyticsManagementHeader = ({
  selectedTabId,
  onTabChange,
  isWatchlistsEnabled,
  hasEntityResolutionLicense,
  shouldDisplayEngineStatusTab,
  selectedSettingsMatchSavedSettings,
  onSaveSettings,
  isSavingSettings,
}: EntityAnalyticsManagementHeaderProps) => {
  const riskEnginePrivileges = useMissingRiskEnginePrivileges();
  const entityStoreStatus = useEntityStoreStatus();
  const { data: entityEnginePrivileges, isLoading: isLoadingPrivileges } =
    useEntityEnginePrivileges();
  const deleteEntityStoreMutation = useDeleteEntityStoreMutation();
  const { docLinks } = useKibana().services;
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const userHasRiskEnginePrivileges =
    !riskEnginePrivileges.isLoading &&
    'hasAllRequiredPrivileges' in riskEnginePrivileges &&
    riskEnginePrivileges.hasAllRequiredPrivileges;
  const userHasEntityStoreInstallPrivileges =
    entityEnginePrivileges?.has_install_permissions ?? false;
  const hasStopPrivileges = userHasEntityStoreStopPrivileges(entityEnginePrivileges);
  // Turning ON enables both the risk score maintainer and the Entity Store, so enablement
  // requires both privilege sets.
  const hasEnablementPrivileges =
    userHasRiskEnginePrivileges && userHasEntityStoreInstallPrivileges;

  const canClearEntityData =
    canDeleteEntityEngine(entityStoreStatus.data?.status) &&
    !!entityEnginePrivileges?.has_all_required;

  const {
    status: toggleStatus,
    isStatusLoading: isToggleStatusLoading,
    toggle: toggleEntityAnalytics,
    errors: toggleErrors,
  } = useToggleEntityAnalytics({
    selectedSettingsMatchSavedSettings,
    onSaveSettings,
    isSavingSettings,
  });

  const isToggleChecked = toggleStatus === 'enabled';
  // Turning the toggle ON installs or starts the Entity Store, so it requires the full
  // enablement privilege set. Turning it OFF stops engines via user-scoped SO updates on
  // entity-engine-descriptor-v2, so it requires SO write privileges, but not the full
  // ES/cluster install set.
  const isToggleDisabled =
    riskEnginePrivileges.isLoading ||
    isLoadingPrivileges ||
    isToggleStatusLoading ||
    toggleStatus === 'enabling' ||
    toggleStatus === 'error' ||
    (isToggleChecked ? !hasStopPrivileges : !hasEnablementPrivileges);

  const tabs: AppHeaderTab[] = useMemo(
    () => [
      {
        id: TabId.RiskScore,
        label: RISK_SCORE_TAB_LABEL,
        isSelected: selectedTabId === TabId.RiskScore,
        onClick: () => onTabChange(TabId.RiskScore),
        'data-test-subj': RISK_SCORE_TAB_TEST_ID,
      },
      {
        id: TabId.AssetCriticality,
        label: ASSET_CRITICALITY_TAB_LABEL,
        isSelected: selectedTabId === TabId.AssetCriticality,
        onClick: () => onTabChange(TabId.AssetCriticality),
        'data-test-subj': ASSET_CRITICALITY_TAB_TEST_ID,
      },
      ...(isWatchlistsEnabled
        ? [
            {
              id: TabId.Watchlists,
              label: WATCHLISTS_TAB_LABEL,
              isSelected: selectedTabId === TabId.Watchlists,
              onClick: () => onTabChange(TabId.Watchlists),
              'data-test-subj': WATCHLISTS_TAB_TEST_ID,
            },
          ]
        : []),
      ...(hasEntityResolutionLicense
        ? [
            {
              id: TabId.EntityResolution,
              label: ENTITY_RESOLUTION_TAB_LABEL,
              isSelected: selectedTabId === TabId.EntityResolution,
              onClick: () => onTabChange(TabId.EntityResolution),
              'data-test-subj': 'entityResolutionTab',
            },
          ]
        : []),
      ...(shouldDisplayEngineStatusTab
        ? [
            {
              id: TabId.Status,
              label: ENGINE_STATUS_TAB_LABEL,
              isSelected: selectedTabId === TabId.Status,
              onClick: () => onTabChange(TabId.Status),
              'data-test-subj': ENGINE_STATUS_TAB_TEST_ID,
            },
          ]
        : []),
    ],
    [
      selectedTabId,
      onTabChange,
      isWatchlistsEnabled,
      hasEntityResolutionLicense,
      shouldDisplayEngineStatusTab,
    ]
  );

  const menu = useMemo<AppHeaderMenu>(
    () => ({
      switch: {
        id: 'entityAnalyticsToggle',
        label: isToggleChecked ? ENABLED_SWITCH_LABEL : DISABLED_SWITCH_LABEL,
        checked: isToggleChecked,
        onChange: () => {
          void toggleEntityAnalytics();
        },
        disabled: isToggleDisabled,
        'data-test-subj': ENTITY_ANALYTICS_SWITCH_TEST_ID,
      },
      items: canClearEntityData
        ? [
            {
              id: 'clearEntityData',
              label: CLEAR_ENTITY_DATA_LABEL,
              iconType: 'trash' as const,
              overflow: true,
              order: 1,
              run: () => setIsClearModalOpen(true),
              testId: CLEAR_ENTITY_DATA_BUTTON_TEST_ID,
            },
          ]
        : [],
    }),
    [canClearEntityData, isToggleChecked, isToggleDisabled, toggleEntityAnalytics]
  );

  const deleteError = safeErrorMessage(deleteEntityStoreMutation.error);

  return (
    <>
      <SecurityAppHeader
        title={ENTITY_ANALYTICS}
        tabs={tabs}
        menu={menu}
        spacing="largeBleed"
        docLink={docLinks.links.securitySolution.entityAnalytics.entityRiskScoring}
      />
      <EntityAnalyticsErrorPanel entityStoreErrors={toggleErrors.entityStore} />
      {deleteError && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            announceOnMount
            title={
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.errors.deleteErrorTitle"
                defaultMessage="There was a problem deleting the entity store"
              />
            }
            color="danger"
            iconType="warning"
          >
            <p>{deleteError}</p>
          </EuiCallOut>
        </>
      )}
      {canClearEntityData && (
        <ClearEntityDataModal
          isOpen={isClearModalOpen}
          onClose={() => setIsClearModalOpen(false)}
          onConfirm={async () => {
            await deleteEntityStoreMutation.mutateAsync();
          }}
          isDeleting={deleteEntityStoreMutation.isLoading}
        />
      )}
    </>
  );
};
