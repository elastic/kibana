/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { EntityAnalyticsToggle } from '../components/entity_analytics_toggle';
import { ENTITY_ANALYTICS } from '../../app/translations';
import { RiskEnginePrivilegesCallOut } from '../components/risk_engine_privileges_callout';
import { useMissingRiskEnginePrivileges } from '../hooks/use_missing_risk_engine_privileges';
import { useConfigurableRiskEngineSettings } from '../components/risk_score_management/hooks/risk_score_configurable_risk_engine_settings_hooks';
import { RiskScoreTab } from '../components/risk_score_management/risk_score_tab';
import { ImportEntitiesTab } from '../components/entity_store/components/import_entities_tab';
import { EntityStoreMissingPrivilegesCallout } from '../components/entity_store/components/entity_store_missing_privileges_callout';
import { EngineStatus } from '../components/entity_store/components/engines_status';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import {
  useDeleteEntityEngineMutation,
  useEntityStoreStatus,
} from '../components/entity_store/hooks/use_entity_store';
import { useEntityEnginePrivileges } from '../components/entity_store/hooks/use_entity_engine_privileges';
import { useEntityStoreTypes } from '../hooks/use_enabled_entity_types';
import { userHasRiskEngineReadPermissions, safeErrorMessage } from '../common';

enum TabId {
  RiskScore = 'riskScore',
  Import = 'import',
  Status = 'status',
}

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

  const isEntityStoreFeatureFlagDisabled = useIsExperimentalFeatureEnabled('entityStoreDisabled');
  const entityStoreStatus = useEntityStoreStatus({});
  const entityTypes = useEntityStoreTypes();
  const { data: entityEnginePrivileges } = useEntityEnginePrivileges();
  const deleteEntityEngineMutation = useDeleteEntityEngineMutation({ entityTypes });

  const userHasRiskEnginePrivileges =
    !riskEnginePrivileges.isLoading &&
    'hasAllRequiredPrivileges' in riskEnginePrivileges &&
    riskEnginePrivileges.hasAllRequiredPrivileges;

  const userHasEntityStorePrivileges = entityEnginePrivileges?.has_all_required ?? false;
  const hasAllRequiredPrivileges = userHasRiskEnginePrivileges || userHasEntityStorePrivileges;

  const canRunEngine =
    (!riskEnginePrivileges.isLoading &&
      (riskEnginePrivileges.hasAllRequiredPrivileges ||
        (!riskEnginePrivileges.hasAllRequiredPrivileges &&
          riskEnginePrivileges.missingPrivileges?.clusterPrivileges?.run?.length === 0))) ||
    false;

  const hasReadPermissions = userHasRiskEngineReadPermissions(riskEnginePrivileges);

  const shouldDisplayEngineStatusTab =
    isEntityStoreInstalled(entityStoreStatus.data?.status) &&
    entityEnginePrivileges?.has_all_required;

  const [selectedTabId, setSelectedTabId] = useState(TabId.RiskScore);

  useEffect(() => {
    if (selectedTabId === TabId.Status && !shouldDisplayEngineStatusTab) {
      setSelectedTabId(TabId.RiskScore);
    }
  }, [shouldDisplayEngineStatusTab, selectedTabId]);

  const deleteError = safeErrorMessage(deleteEntityEngineMutation.error);

  return (
    <>
      <RiskEnginePrivilegesCallOut privileges={riskEnginePrivileges} />
      <EuiPageHeader
        data-test-subj="entityAnalyticsManagementPage"
        pageTitle={
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem data-test-subj="entityAnalyticsManagementPageTitle" grow={false}>
              {ENTITY_ANALYTICS}
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="m">
                <EntityAnalyticsToggle
                  selectedSettingsMatchSavedSettings={selectedSettingsMatchSavedSettings}
                  onSaveSettings={handleSaveToggleSettings}
                  isSavingSettings={saveSelectedSettingsMutation.isLoading}
                  hasAllRequiredPrivileges={hasAllRequiredPrivileges}
                  isPrivilegesLoading={riskEnginePrivileges.isLoading}
                />
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />

      {isEntityStoreFeatureFlagDisabled && <EntityStoreFeatureFlagNotAvailableCallout />}
      {!entityEnginePrivileges || entityEnginePrivileges.has_all_required ? null : (
        <>
          <EuiSpacer size="l" />
          <EntityStoreMissingPrivilegesCallout privileges={entityEnginePrivileges} />
          <EuiSpacer size="l" />
        </>
      )}

      <EuiSpacer size="m" />

      <EuiTabs data-test-subj="entityAnalyticsManagementTabs">
        <EuiTab
          key={TabId.RiskScore}
          isSelected={selectedTabId === TabId.RiskScore}
          onClick={() => setSelectedTabId(TabId.RiskScore)}
          data-test-subj="riskScoreTab"
        >
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.riskScore.tabTitle"
            defaultMessage="Entity Risk Score"
          />
        </EuiTab>
        <EuiTab
          key={TabId.Import}
          isSelected={selectedTabId === TabId.Import}
          onClick={() => setSelectedTabId(TabId.Import)}
          data-test-subj="importEntitiesTab"
        >
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.importEntities.tabTitle"
            defaultMessage="Import Entities"
          />
        </EuiTab>
        {shouldDisplayEngineStatusTab && (
          <EuiTab
            key={TabId.Status}
            isSelected={selectedTabId === TabId.Status}
            onClick={() => setSelectedTabId(TabId.Status)}
            data-test-subj="engineStatusTab"
          >
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.engineStatus.tabTitle"
              defaultMessage="Engine Status"
            />
          </EuiTab>
        )}
      </EuiTabs>

      <EuiSpacer size="s" />

      <div hidden={selectedTabId !== TabId.RiskScore}>
        <RiskScoreTab
          canRunEngine={canRunEngine}
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

      <div hidden={selectedTabId !== TabId.Import}>
        <ImportEntitiesTab deleteError={deleteError} engines={entityStoreStatus.data?.engines} />
      </div>

      {shouldDisplayEngineStatusTab && (
        <div hidden={selectedTabId !== TabId.Status}>
          <EngineStatus
            onDeleteEntityEngine={async () => {
              await deleteEntityEngineMutation.mutateAsync();
            }}
            isDeletingEntityEngine={deleteEntityEngineMutation.isLoading}
          />
        </div>
      )}
    </>
  );
};

EntityAnalyticsManagementPage.displayName = 'EntityAnalyticsManagementPage';

const EntityStoreFeatureFlagNotAvailableCallout: React.FC = () => {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.featureFlagDisabled"
            defaultMessage="Entity Store capabilities not available"
          />
        }
        color="primary"
        iconType="info"
      >
        <EuiText size="s">
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.featureFlagDisabledDescription"
            defaultMessage="The full capabilities of the Entity Store have been disabled in this environment. Contact your administrator for further assistance."
          />
        </EuiText>
      </EuiCallOut>
    </>
  );
};
