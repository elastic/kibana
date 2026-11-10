/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useHistory, useParams } from 'react-router-dom';

import { RiskEnginePrivilegesCallOut } from '../components/risk_engine_privileges_callout';
import { useMissingRiskEnginePrivileges } from '../hooks/use_missing_risk_engine_privileges';
import { useConfigurableRiskEngineSettings } from '../components/risk_score_management/hooks/risk_score_configurable_risk_engine_settings_hooks';
import { RiskScoreTab } from '../components/risk_score_management/risk_score_tab';
import { AssetCriticalityTab } from '../components/asset_criticality/asset_criticality_tab';
import { WatchlistsTab } from '../components/watchlists/watchlists_tab';
import { EntityResolutionTab } from '../components/entity_resolution';
import { EntityStoreMissingPrivilegesCallout } from '../components/entity_store/components/entity_store_missing_privileges_callout';
import { EntityStoreMissingStopPrivilegesCallout } from '../components/entity_store/components/entity_store_missing_stop_privileges_callout';
import { EngineStatus } from '../components/entity_store/components/engines_status';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useHasEntityResolutionLicense } from '../../common/hooks/use_has_entity_resolution_license';
import { useEntityStoreStatus } from '../components/entity_store/hooks/use_entity_store';
import { useEntityEnginePrivileges } from '../components/entity_store/hooks/use_entity_engine_privileges';
import { ENTITY_ANALYTICS_MANAGEMENT_PATH } from '../../../common/constants';
import { userHasRiskEngineReadPermissions, userHasEntityStoreStopPrivileges } from '../common';
import { EntityAnalyticsManagementHeader, TabId } from './entity_analytics_management_header';

export { TabId };

const VALID_TABS = Object.values(TabId);

const isEntityStoreInstalled = (status?: string) => status && status !== 'not_installed';

export const EntityAnalyticsManagementPage = () => {
  const riskEnginePrivileges = useMissingRiskEnginePrivileges();

  const riskEngineSettings = useConfigurableRiskEngineSettings();
  const {
    savedRiskEngineSettings,
    selectedRiskEngineSettings,
    selectedSettingsMatchSavedSettings,
    resetSelectedSettings,
    saveSelectedSettingsMutation,
    setSelectedDateSetting,
    toggleSelectedClosedAlertsSetting,
    isLoadingRiskEngineSettings,
    toggleScoreRetainment,
    setAlertFilters,
    getUIAlertFilters,
  } = riskEngineSettings;

  const handleSaveToggleSettings = useCallback(async () => {
    if (selectedRiskEngineSettings) {
      await saveSelectedSettingsMutation.mutateAsync(selectedRiskEngineSettings);
    }
  }, [selectedRiskEngineSettings, saveSelectedSettingsMutation]);

  const isWatchlistsEnabled = useIsExperimentalFeatureEnabled('entityAnalyticsWatchlistEnabled');
  const hasEntityResolutionLicense = useHasEntityResolutionLicense();

  const entityStoreStatus = useEntityStoreStatus();
  const { data: entityEnginePrivileges, isLoading: isLoadingPrivileges } =
    useEntityEnginePrivileges();

  const hasStopPrivileges = userHasEntityStoreStopPrivileges(entityEnginePrivileges);
  const hasReadPermissions = userHasRiskEngineReadPermissions(riskEnginePrivileges);

  const shouldDisplayEngineStatusTab =
    isEntityStoreInstalled(entityStoreStatus.data?.status) &&
    entityEnginePrivileges?.has_all_required;

  const history = useHistory();
  const { tab } = useParams<{ tab?: string }>();

  const selectedTabId = useMemo(() => {
    if (tab && VALID_TABS.includes(tab as TabId)) {
      return tab as TabId;
    }
    return TabId.RiskScore;
  }, [tab]);

  const handleTabChange = useCallback(
    (tabId: TabId) => {
      history.push(`${ENTITY_ANALYTICS_MANAGEMENT_PATH}/${tabId}`);
    },
    [history]
  );

  const isStatusDataLoading = entityStoreStatus.isLoading || isLoadingPrivileges;

  useEffect(() => {
    if (selectedTabId === TabId.Status && !isStatusDataLoading && !shouldDisplayEngineStatusTab) {
      history.replace(`${ENTITY_ANALYTICS_MANAGEMENT_PATH}/${TabId.RiskScore}`);
    }
    if (selectedTabId === TabId.EntityResolution && !hasEntityResolutionLicense) {
      history.replace(`${ENTITY_ANALYTICS_MANAGEMENT_PATH}/${TabId.RiskScore}`);
    }
  }, [
    shouldDisplayEngineStatusTab,
    isStatusDataLoading,
    hasEntityResolutionLicense,
    selectedTabId,
    history,
  ]);

  const isEntityAnalyticsOn = entityStoreStatus.data?.status === 'running' || false;
  const showEntityStoreEnablementCallout =
    !isEntityAnalyticsOn &&
    !!entityEnginePrivileges &&
    !entityEnginePrivileges.has_install_permissions;
  const showStopPrivilegesCallout =
    isEntityAnalyticsOn && !isLoadingPrivileges && !hasStopPrivileges;

  return (
    <>
      <RiskEnginePrivilegesCallOut privileges={riskEnginePrivileges} />
      <EntityAnalyticsManagementHeader
        selectedTabId={selectedTabId}
        onTabChange={handleTabChange}
        isWatchlistsEnabled={isWatchlistsEnabled}
        hasEntityResolutionLicense={hasEntityResolutionLicense}
        shouldDisplayEngineStatusTab={!!shouldDisplayEngineStatusTab}
        selectedSettingsMatchSavedSettings={selectedSettingsMatchSavedSettings}
        onSaveSettings={handleSaveToggleSettings}
        isSavingSettings={saveSelectedSettingsMutation.isLoading}
      />

      {showEntityStoreEnablementCallout && (
        <>
          <EuiSpacer size="l" />
          <EntityStoreMissingPrivilegesCallout privileges={entityEnginePrivileges} />
          <EuiSpacer size="l" />
        </>
      )}

      {showStopPrivilegesCallout && entityEnginePrivileges && (
        <>
          <EuiSpacer size="l" />
          <EntityStoreMissingStopPrivilegesCallout privileges={entityEnginePrivileges} />
          <EuiSpacer size="l" />
        </>
      )}

      <EuiSpacer size="m" />

      <div hidden={selectedTabId !== TabId.RiskScore}>
        <RiskScoreTab
          hasReadPermissions={hasReadPermissions}
          isPrivilegesLoading={riskEnginePrivileges.isLoading}
          savedRiskEngineSettings={savedRiskEngineSettings}
          selectedRiskEngineSettings={selectedRiskEngineSettings}
          selectedSettingsMatchSavedSettings={selectedSettingsMatchSavedSettings}
          resetSelectedSettings={resetSelectedSettings}
          onSaveSettings={(settings) => saveSelectedSettingsMutation.mutateAsync(settings)}
          isSavingSettings={saveSelectedSettingsMutation.isLoading}
          setSelectedDateSetting={setSelectedDateSetting}
          toggleSelectedClosedAlertsSetting={toggleSelectedClosedAlertsSetting}
          isLoadingRiskEngineSettings={isLoadingRiskEngineSettings}
          toggleScoreRetainment={toggleScoreRetainment}
          setAlertFilters={setAlertFilters}
          getUIAlertFilters={getUIAlertFilters}
        />
      </div>

      <div hidden={selectedTabId !== TabId.AssetCriticality}>
        <AssetCriticalityTab />
      </div>

      {isWatchlistsEnabled && (
        <div hidden={selectedTabId !== TabId.Watchlists}>
          <WatchlistsTab />
        </div>
      )}

      {hasEntityResolutionLicense && (
        <div hidden={selectedTabId !== TabId.EntityResolution}>
          <EntityResolutionTab />
        </div>
      )}

      {shouldDisplayEngineStatusTab && (
        <div hidden={selectedTabId !== TabId.Status}>
          <EngineStatus />
        </div>
      )}
    </>
  );
};

EntityAnalyticsManagementPage.displayName = 'EntityAnalyticsManagementPage';
